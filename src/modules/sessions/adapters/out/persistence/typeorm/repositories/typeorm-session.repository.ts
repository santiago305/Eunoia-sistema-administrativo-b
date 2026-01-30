import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionRepository } from '../../../../../application/ports/session.repository';
import { Session as DomainSession } from '../../../../../domain/entities/session.entity';
import { Session as OrmSession } from '../entities/session.entity';
import { SessionMapper } from '../mappers/session.mapper';

@Injectable()
export class TypeormSessionRepository implements SessionRepository {
  constructor(
    @InjectRepository(OrmSession)
    private readonly ormRepository: Repository<OrmSession>
  ) {}
  async findActiveByUserAndDevice(
    userId: string,
    deviceId: string,
  ): Promise<DomainSession | null> {
    const ormSession = await this.ormRepository
      .createQueryBuilder('s')
      .where('s.userId = :userId', { userId })
      .andWhere('s.deviceId = :deviceId', { deviceId })
      .andWhere('s.revokedAt IS NULL')
      .andWhere('s.expiresAt > :now', { now: new Date() })
      .orderBy('s.createdAt', 'DESC')
      .getOne();
  return ormSession ? SessionMapper.toDomain(ormSession) : null;
}


  async save(session: DomainSession): Promise<DomainSession> {
    const ormSession = this.ormRepository.create(SessionMapper.toPersistence(session));
    const saved = await this.ormRepository.save(ormSession);
    return SessionMapper.toDomain(saved);
  }

  async findById(id: string): Promise<DomainSession | null> {
    const session = await this.ormRepository.findOne({ where: { id } });
    return session ? SessionMapper.toDomain(session) : null;
  }

  async updateLastSeen(id: string, lastSeenAt: Date): Promise<void> {
    await this.ormRepository.update(id, { lastSeenAt });
  }

  async updateRefreshTokenHash(id: string, refreshTokenHash: string, expiresAt: Date): Promise<void> {
    await this.ormRepository.update(id, { refreshTokenHash, expiresAt });
  }

  async revoke(id: string, revokedAt: Date): Promise<void> {
    await this.ormRepository.update(id, { revokedAt });
  }

  async revokeAllForUser(userId: string, revokedAt: Date): Promise<void> {
    await this.ormRepository
      .createQueryBuilder()
      .update(OrmSession)
      .set({ revokedAt })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }
}
