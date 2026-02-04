import { Session as DomainSession } from '../../../../../domain/entities/session.entity';
import { SessionFactory } from '../../../../../domain/factories/session.factory';
import { Session as OrmSession } from '../entities/session.entity';

export class SessionMapper {
  static toDomain(orm: OrmSession): DomainSession {
    const userId = orm.user?.id ?? (orm as any).userId;
    return SessionFactory.reconstitute({
      id: orm.id,
      userId,
      refreshTokenHash: orm.refreshTokenHash,
      createdAt: orm.createdAt,
      lastUsedAt: orm.lastUsedAt,
      expiresAt: orm.expiresAt,
      revokedAt: orm.revokedAt,
      ip: orm.ip,
      userAgent: orm.userAgent,
      deviceName: orm.deviceName,
    });
  }

  static toPersistence(domain: DomainSession): Partial<OrmSession> {
    return {
      id: domain.id,
      user: domain.userId ? ({ id: domain.userId } as OrmSession['user']) : undefined,
      refreshTokenHash: domain.refreshTokenHash,
      createdAt: domain.createdAt,
      lastUsedAt: domain.lastUsedAt,
      expiresAt: domain.expiresAt,
      revokedAt: domain.revokedAt,
      ip: domain.ip,
      userAgent: domain.userAgent,
      deviceName: domain.deviceName,
    };
  }
}
