import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionReadRepository } from '../../../../../application/ports/session-read.repository';
import { Session as DomainSession } from '../../../../../domain/entities/session.entity';
import { Session as OrmSession } from '../entities/session.entity';
import { SessionMapper } from '../mappers/session.mapper';

@Injectable()
export class TypeormSessionReadRepository implements SessionReadRepository {
  constructor(
    @InjectRepository(OrmSession)
    private readonly ormRepository: Repository<OrmSession>,
  ) {}

  async listActiveByUserId(userId: string): Promise<DomainSession[]> {
    const now = new Date();
    const sessions = await this.ormRepository.find({
      where: {
        user: { id: userId },
        revokedAt: null,
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return sessions
      .filter((session) => session.expiresAt > now)
      .map((session) => SessionMapper.toDomain(session));
  }

  async findByIdAndUserId(sessionId: string, userId: string): Promise<DomainSession | null> {
    const session = await this.ormRepository.findOne({
      where: {
        id: sessionId,
        user: { id: userId },
      },
      relations: ['user'],
    });

    return session ? SessionMapper.toDomain(session) : null;
  }
}
