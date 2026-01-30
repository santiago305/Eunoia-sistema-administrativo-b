import { Session as DomainSession } from '../../../../../domain/entities/session.entity';
import { SessionFactory } from '../../../../../domain/factories/session.factory';
import { Session as OrmSession } from '../entities/session.entity';

export class SessionMapper {
  static toDomain(orm: OrmSession): DomainSession {
    return SessionFactory.reconstitute({
      id: orm.id,
      userId: orm.userId,
      deviceId: orm.deviceId,
      deviceName: orm.deviceName ?? null,
      userAgent: orm.userAgent ?? null,
      ipAddress: orm.ipAddress ?? null,
      refreshTokenHash: orm.refreshTokenHash,
      createdAt: orm.createdAt,
      lastSeenAt: orm.lastSeenAt,
      revokedAt: orm.revokedAt ?? null,
      expiresAt: orm.expiresAt,
    });
  }

  static toPersistence(domain: DomainSession): Partial<OrmSession> {
    return {
      id: domain.id,
      userId: domain.userId,
      deviceId: domain.deviceId,
      deviceName: domain.deviceName ?? null,
      userAgent: domain.userAgent ?? null,
      ipAddress: domain.ipAddress ?? null,
      refreshTokenHash: domain.refreshTokenHash,
      createdAt: domain.createdAt,
      lastSeenAt: domain.lastSeenAt,
      revokedAt: domain.revokedAt ?? null,
      expiresAt: domain.expiresAt,
    };
  }
}
