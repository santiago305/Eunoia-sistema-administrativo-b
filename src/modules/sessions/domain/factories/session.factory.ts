import { Session } from '../entities/session.entity';

export class SessionFactory {
  static create(params: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    createdAt?: Date;
    lastUsedAt?: Date | null;
    expiresAt: Date;
    revokedAt?: Date | null;
    ip?: string | null;
    userAgent?: string | null;
    deviceName?: string | null;
  }): Session {
    return new Session(
      params.id,
      params.userId,
      params.refreshTokenHash,
      params.createdAt ?? new Date(),
      params.lastUsedAt ?? new Date(),
      params.expiresAt,
      params.revokedAt ?? null,
      params.ip ?? null,
      params.userAgent ?? null,
      params.deviceName ?? null,
    );
  }

  static reconstitute(params: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    createdAt: Date;
    lastUsedAt: Date | null;
    expiresAt: Date;
    revokedAt: Date | null;
    ip: string | null;
    userAgent: string | null;
    deviceName: string | null;
  }): Session {
    return new Session(
      params.id,
      params.userId,
      params.refreshTokenHash,
      params.createdAt,
      params.lastUsedAt,
      params.expiresAt,
      params.revokedAt,
      params.ip,
      params.userAgent,
      params.deviceName,
    );
  }
}
