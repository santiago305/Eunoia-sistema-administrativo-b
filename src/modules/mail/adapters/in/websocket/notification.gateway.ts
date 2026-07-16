import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { envs } from 'src/infrastructure/config/envs';
import { NotificationRealtimeService } from 'src/modules/mail/infrastructure/realtime/notification-realtime.service';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: envs.corsOrigins,
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly realtimeService: NotificationRealtimeService) {}

  handleConnection(client: Socket) {
    const userId = String(client.handshake.auth?.userId ?? '').trim();

    if (!userId) {
      client.disconnect(true);
      return;
    }

    client.data.userId = userId;
    this.realtimeService.registerConnection(userId, client);
    this.realtimeService.logStats();
    this.logger.debug(`notification socket connected userId=${userId} socketId=${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId = String(client.data.userId ?? '').trim();
    if (!userId) return;
    this.realtimeService.unregisterConnection(userId, client.id);
    this.realtimeService.logStats();
    this.logger.debug(`notification socket disconnected userId=${userId} socketId=${client.id}`);
  }

  @SubscribeMessage('notification.ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() body: { ts?: number }) {
    client.emit('notification.pong', {
      ts: Date.now(),
      receivedTs: body?.ts ?? null,
    });
  }
}
