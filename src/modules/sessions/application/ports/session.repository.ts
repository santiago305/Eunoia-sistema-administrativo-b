import { Session } from '../../domain/entities/session.entity';

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

export interface SessionRepository {
  save(session: Session): Promise<Session>;
  revokeById(sessionId: string, userId: string): Promise<void>;
  revokeAllByUserId(userId: string): Promise<void>;
  updateUsage(sessionId: string, params: { refreshTokenHash?: string; lastUsedAt?: Date; expiresAt?: Date }): Promise<void>;
}
