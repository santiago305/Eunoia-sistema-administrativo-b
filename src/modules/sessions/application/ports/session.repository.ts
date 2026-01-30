import { Session } from '../../domain/entities/session.entity';

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

export interface SessionRepository {
  save(session: Session): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  findActiveByUserAndDevice(userId: string, deviceId: string): Promise<Session | null>;
  updateLastSeen(id: string, lastSeenAt: Date): Promise<void>;
  updateRefreshTokenHash(id: string, refreshTokenHash: string, expiresAt: Date): Promise<void>;
  revoke(id: string, revokedAt: Date): Promise<void>;
  revokeAllForUser(userId: string, revokedAt: Date): Promise<void>;
  revokeAllForUserExceptDevice(userId: string, deviceId: string, revokedAt: Date): Promise<void>;
}
