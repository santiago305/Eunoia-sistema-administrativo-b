import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionReadRepository } from '../../../../../application/ports/session-read.repository';
import { Session as OrmSession } from '../entities/session.entity';

@Injectable()
export class TypeormSessionReadRepository implements SessionReadRepository {
  constructor(
    @InjectRepository(OrmSession)
    private readonly ormRepository: Repository<OrmSession>
  ) {}

  async listUserSessions(
    userId: string,
    params?: { includeRevoked?: boolean; includeExpired?: boolean }
  ) {
    const query = this.ormRepository
      .createQueryBuilder('session')
      .where('session.user_id = :userId', { userId });

    if (!params?.includeRevoked) {
      query.andWhere('session.revoked_at IS NULL');
    }

    if (!params?.includeExpired) {
      query.andWhere('session.expires_at > :now', { now: new Date() });
    }

    const sessions = await query
      .orderBy('session.last_seen_at', 'DESC')
      .getMany();

    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      deviceId: session.deviceId,
      deviceName: session.deviceName ?? null,
      userAgent: session.userAgent ?? null,
      ipAddress: session.ipAddress ?? null,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      revokedAt: session.revokedAt ?? null,
      expiresAt: session.expiresAt,
    }));
  }

  async findById(id: string) {
    const session = await this.ormRepository.findOne({ where: { id } });
    if (!session) return null;

    return {
      id: session.id,
      userId: session.userId,
      deviceId: session.deviceId,
      deviceName: session.deviceName ?? null,
      userAgent: session.userAgent ?? null,
      ipAddress: session.ipAddress ?? null,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      revokedAt: session.revokedAt ?? null,
      expiresAt: session.expiresAt,
    };
  }

  async findAuthById(id: string) {
    const session = await this.ormRepository.findOne({
      where: { id },
      select: ['id', 'userId', 'refreshTokenHash', 'revokedAt', 'expiresAt'],
    });

    if (!session) return null;

    return {
      id: session.id,
      userId: session.userId,
      refreshTokenHash: session.refreshTokenHash,
      revokedAt: session.revokedAt ?? null,
      expiresAt: session.expiresAt,
    };
  }
}
