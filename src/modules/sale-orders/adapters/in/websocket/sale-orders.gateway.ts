import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { SaleOrdersRealtimeService } from "src/modules/sale-orders/infrastructure/realtime/sale-orders-realtime.service";

@WebSocketGateway({
  namespace: "/sale-orders",
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  },
})
export class SaleOrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SaleOrdersGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly realtimeService: SaleOrdersRealtimeService) {}

  handleConnection(client: Socket) {
    const userId = String(client.handshake.auth?.userId ?? "").trim();

    if (!userId) {
      client.disconnect(true);
      return;
    }

    client.data.userId = userId;
    this.realtimeService.registerConnection(userId, client);
    this.realtimeService.logStats();
    this.logger.debug(`sale-orders socket connected userId=${userId} socketId=${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId = String(client.data.userId ?? "").trim();
    if (!userId) return;
    this.realtimeService.unregisterConnection(userId, client.id);
    this.realtimeService.logStats();
    this.logger.debug(`sale-orders socket disconnected userId=${userId} socketId=${client.id}`);
  }

  @SubscribeMessage("sale-orders.ping")
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() body: { ts?: number }) {
    client.emit("sale-orders.pong", {
      ts: Date.now(),
      receivedTs: body?.ts ?? null,
    });
  }
}
