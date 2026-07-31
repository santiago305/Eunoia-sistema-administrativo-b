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
import { envs } from "src/infrastructure/config/envs";
import { SaleOrdersRealtimeService } from "src/modules/sale-orders/infrastructure/realtime/sale-orders-realtime.service";
import { SocketSessionAuthorizerService } from "src/modules/auth/application/services/socket-session-authorizer.service";

@WebSocketGateway({
  namespace: "/sale-orders",
  cors: {
    origin: envs.corsOrigins,
    credentials: true,
  },
})
export class SaleOrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SaleOrdersGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly realtimeService: SaleOrdersRealtimeService, private readonly authorizer?: SocketSessionAuthorizerService) {}

  async handleConnection(client: Socket) {
    const identity = this.authorizer
      ? await this.authorizer.authorize(client.handshake, "sale-orders")
      : null;
    if (!identity) {
      client.disconnect(true);
      return;
    }

    client.data.userId = identity.userId;
    client.data.sessionId = identity.sessionId;
    this.realtimeService.registerConnection(identity.userId, client);
    this.realtimeService.logStats();
    this.logger.debug(`sale-orders socket connected userId=${identity.userId} socketId=${client.id}`);
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
