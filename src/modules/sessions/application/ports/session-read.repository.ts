import { Session } from '../../domain/entities/session.entity';

export const SESSION_READ_REPOSITORY = Symbol('SESSION_READ_REPOSITORY');

export interface SessionReadRepository {
  listActiveByUserId(userId: string): Promise<Session[]>;
  findByIdAndUserId(sessionId: string, userId: string): Promise<Session | null>;
}
