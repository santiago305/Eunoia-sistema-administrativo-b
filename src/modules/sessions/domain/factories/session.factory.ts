import { Session } from '../entities/session.entity';

export class SessionFactory {
  static createNew(params: {
    id?: string;
    userId: string;
    deviceId: string;
    deviceName: string | null;
    userAgent: string | null;
    ipAddress: string | null;
    refreshTokenHash: string;
    expiresAt: Date;
  }): Session {
    const now = new Date();
    return new Session(
      params.id,
      params.userId,
      params.deviceId,
      params.deviceName,
      params.userAgent,
      params.ipAddress,
      params.refreshTokenHash,
      now,
      now,
      null,
      params.expiresAt
    );
  }

  static reconstitute(params: {
    id: string;
    userId: string;
    deviceId: string;
    deviceName: string | null;
    userAgent: string | null;
    ipAddress: string | null;
    refreshTokenHash: string;
    createdAt: Date;
    lastSeenAt: Date;
    revokedAt: Date | null;
    expiresAt: Date;
  }): Session {
    return new Session(
      params.id,
      params.userId,
      params.deviceId,
      params.deviceName,
      params.userAgent,
      params.ipAddress,
      params.refreshTokenHash,
      params.createdAt,
      params.lastSeenAt,
      params.revokedAt,
      params.expiresAt
    );
  }
}