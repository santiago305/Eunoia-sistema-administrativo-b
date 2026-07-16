import { Inject, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Subscription } from "rxjs";
import { Server, Socket } from "socket.io";
import { envs } from "src/infrastructure/config/envs";
import {
  INVENTORY_REALTIME,
  InventoryRealtime,
} from "src/modules/product-catalog/integration/inventory/ports/inventory-realtime.port";
import { InventorySocketRealtimeService } from "src/modules/product-catalog/infrastructure/realtime/inventory-socket-realtime.service";

@WebSocketGateway({
  namespace: "/inventory",
  cors: {
    origin: envs.corsOrigins,
    credentials: true,
  },
})
export class InventoryGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventoryGateway.name);
  private readonly subscriptions = new Subscription();

  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(INVENTORY_REALTIME)
    private readonly inventoryRealtime: InventoryRealtime,
    private readonly realtimeService: InventorySocketRealtimeService,
  ) {}

  onModuleInit() {
    this.subscriptions.add(
      this.inventoryRealtime.stream().subscribe((event) => {
        if (event.type !== "stock.updated") return;
        this.realtimeService.emitToAllConnected("stock.updated", event.payload);
      }),
    );
  }

  onModuleDestroy() {
    this.subscriptions.unsubscribe();
  }

  handleConnection(client: Socket) {
    const userId = String(client.handshake.auth?.userId ?? "").trim();

    if (!userId) {
      client.disconnect(true);
      return;
    }

    client.data.userId = userId;
    this.realtimeService.registerConnection(userId, client);
    this.realtimeService.logStats();
    this.logger.debug(`inventory socket connected userId=${userId} socketId=${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId = String(client.data.userId ?? "").trim();
    if (!userId) return;
    this.realtimeService.unregisterConnection(userId, client.id);
    this.realtimeService.logStats();
    this.logger.debug(`inventory socket disconnected userId=${userId} socketId=${client.id}`);
  }

  @SubscribeMessage("inventory.ping")
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() body: { ts?: number }) {
    client.emit("inventory.pong", {
      ts: Date.now(),
      receivedTs: body?.ts ?? null,
    });
  }
}
