import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { envs } from "src/infrastructure/config/envs";
import { WorkflowReactivityRealtimeService } from "src/modules/sale-orders/infrastructure/realtime/workflow-reactivity-realtime.service";
import { SocketSessionAuthorizerService } from "src/modules/auth/application/services/socket-session-authorizer.service";

@WebSocketGateway({
  namespace: "/workflow-reactivity",
  cors: {
    origin: envs.corsOrigins,
    credentials: true,
  },
})
export class WorkflowReactivityGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WorkflowReactivityGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly realtimeService: WorkflowReactivityRealtimeService, private readonly authorizer?: SocketSessionAuthorizerService) {}

  async handleConnection(client: Socket) {
    const identity = this.authorizer
      ? await this.authorizer.authorize(client.handshake, "workflow-reactivity")
      : null;
    if (!identity) {
      client.disconnect(true);
      return;
    }

    client.data.userId = identity.userId;
    client.data.sessionId = identity.sessionId;
    this.realtimeService.registerConnection(identity.userId, client);
    this.realtimeService.logStats();
    this.logger.debug(`workflow-reactivity socket connected userId=${identity.userId} socketId=${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId = String(client.data.userId ?? "").trim();
    if (!userId) return;
    this.realtimeService.unregisterConnection(userId, client.id);
    this.realtimeService.logStats();
    this.logger.debug(`workflow-reactivity socket disconnected userId=${userId} socketId=${client.id}`);
  }

  @SubscribeMessage("workflow-reactivity.ping")
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() body: { ts?: number }) {
    client.emit("workflow-reactivity.pong", {
      ts: Date.now(),
      receivedTs: body?.ts ?? null,
    });
  }
}
