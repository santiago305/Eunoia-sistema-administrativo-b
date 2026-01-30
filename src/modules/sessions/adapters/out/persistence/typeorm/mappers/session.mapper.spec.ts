import { SessionFactory } from '../../../../../domain/factories/session.factory';
import { Session as OrmSession } from '../entities/session.entity';
import { SessionMapper } from './session.mapper';

describe('SessionMapper', () => {
  it('maps to domain', () => {
    const orm = new OrmSession();
    orm.id = 'session-1';
    orm.userId = 'user-1';
    orm.deviceId = 'device-1';
    orm.deviceName = 'Laptop';
    orm.userAgent = 'UA';
    orm.ipAddress = '127.0.0.1';
    orm.refreshTokenHash = 'hash';
    orm.createdAt = new Date('2026-01-01T00:00:00Z');
    orm.lastSeenAt = new Date('2026-01-02T00:00:00Z');
    orm.revokedAt = null;
    orm.expiresAt = new Date('2026-02-01T00:00:00Z');

    const domain = SessionMapper.toDomain(orm);

    expect(domain.id).toBe('session-1');
    expect(domain.userId).toBe('user-1');
    expect(domain.deviceId).toBe('device-1');
    expect(domain.deviceName).toBe('Laptop');
    expect(domain.userAgent).toBe('UA');
    expect(domain.ipAddress).toBe('127.0.0.1');
    expect(domain.refreshTokenHash).toBe('hash');
    expect(domain.createdAt?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(domain.lastSeenAt?.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(domain.revokedAt).toBeNull();
    expect(domain.expiresAt?.toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });

  it('maps to persistence', () => {
    const domain = SessionFactory.reconstitute({
      id: 'session-1',
      userId: 'user-1',
      deviceId: 'device-1',
      deviceName: null,
      userAgent: null,
      ipAddress: null,
      refreshTokenHash: 'hash',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      lastSeenAt: new Date('2026-01-02T00:00:00Z'),
      revokedAt: null,
      expiresAt: new Date('2026-02-01T00:00:00Z'),
    });

    const persisted = SessionMapper.toPersistence(domain);

    expect(persisted).toEqual({
      id: 'session-1',
      userId: 'user-1',
      deviceId: 'device-1',
      deviceName: null,
      userAgent: null,
      ipAddress: null,
      refreshTokenHash: 'hash',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      lastSeenAt: new Date('2026-01-02T00:00:00Z'),
      revokedAt: null,
      expiresAt: new Date('2026-02-01T00:00:00Z'),
    });
  });
});
