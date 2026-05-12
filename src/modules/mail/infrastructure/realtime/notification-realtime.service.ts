import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class NotificationRealtimeService {
  private readonly logger = new Logger(NotificationRealtimeService.name);
  private readonly userSockets = new Map<string, Set<string>>();
  private readonly sockets = new Map<string, Socket>();

  registerConnection(userId: string, socket: Socket) {
    const current = this.userSockets.get(userId) ?? new Set<string>();
    current.add(socket.id);
    this.userSockets.set(userId, current);
    this.sockets.set(socket.id, socket);
  }

  unregisterConnection(userId: string, socketId: string) {
    const current = this.userSockets.get(userId);
    if (current) {
      current.delete(socketId);
      if (!current.size) {
        this.userSockets.delete(userId);
      }
    }
    this.sockets.delete(socketId);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds?.size) return;

    socketIds.forEach((socketId) => {
      const socket = this.sockets.get(socketId);
      socket?.emit(event, payload);
    });
  }

  connectedUsersCount() {
    return this.userSockets.size;
  }

  activeConnectionsCount() {
    return this.sockets.size;
  }

  logStats() {
    this.logger.debug(
      `notification realtime stats users=${this.connectedUsersCount()} sockets=${this.activeConnectionsCount()}`,
    );
  }
}
