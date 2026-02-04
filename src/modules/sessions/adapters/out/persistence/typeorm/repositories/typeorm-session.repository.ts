import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionRepository } from '../../../../../application/ports/session.repository';
import { Session } from '../../../../../domain/entities/session.entity';
import { Session as OrmSession } from '../entities/session.entity';
import { SessionMapper } from '../mappers/session.mapper';

@Injectable()
export class TypeormSessionRepository implements SessionRepository {
  constructor(
    @InjectRepository(OrmSession)
    private readonly ormRepository: Repository<OrmSession>,
  ) {}

  async save(session: Session): Promise<Session> {
    const ormSession = this.ormRepository.create(SessionMapper.toPersistence(session));
    const saved = await this.ormRepository.save(ormSession);
    return SessionMapper.toDomain(saved);
  }

  async revokeById(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.ormRepository
      .createQueryBuilder()
      .update(OrmSession)
      .set({ revokedAt: new Date() })
      .where('id = :id', { id: sessionId })
      .andWhere('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async revokeAllByUserId(userId: string, currentSessionId?: string): Promise<number> {
    const qb = this.ormRepository
      .createQueryBuilder()
      .update(OrmSession)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL');

    if (currentSessionId) {
      qb.andWhere('id != :currentSessionId', { currentSessionId });
    }

    const result = await qb.execute();
    return result.affected ?? 0;
  }

  async updateUsage(sessionId: string, params: { refreshTokenHash?: string; lastUsedAt?: Date; expiresAt?: Date }): Promise<void> {
    const payload: Partial<OrmSession> = {};
    if (params.refreshTokenHash) payload.refreshTokenHash = params.refreshTokenHash;
    if (params.lastUsedAt) payload.lastUsedAt = params.lastUsedAt;
    if (params.expiresAt) payload.expiresAt = params.expiresAt;

    if (Object.keys(payload).length === 0) return;

    await this.ormRepository
      .createQueryBuilder()
      .update(OrmSession)
      .set(payload)
      .where('id = :id', { id: sessionId })
      .execute();
  }
}
