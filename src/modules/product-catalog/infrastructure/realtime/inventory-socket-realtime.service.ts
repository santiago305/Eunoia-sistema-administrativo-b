import { Injectable, Logger } from "@nestjs/common";
import { Socket } from "socket.io";

@Injectable()
export class InventorySocketRealtimeService {
  private readonly logger = new Logger(InventorySocketRealtimeService.name);
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

  emitToAllConnected(event: string, payload: unknown) {
    this.sockets.forEach((socket) => {
      socket.emit(event, payload);
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
      `inventory realtime stats users=${this.connectedUsersCount()} sockets=${this.activeConnectionsCount()}`,
    );
  }
}
