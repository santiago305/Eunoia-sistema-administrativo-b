import { Repository } from 'typeorm';
import { TypeormSessionRepository } from './typeorm-session.repository';
import { Session as OrmSession } from '../entities/session.entity';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionFactory } from '../../../../../domain/factories/session.factory';

describe('TypeormSessionRepository', () => {
  const makeRepo = (overrides?: Partial<Repository<OrmSession>>) => {
    return new TypeormSessionRepository(overrides as Repository<OrmSession>);
  };

  it('findById returns null when not found', async () => {
    const repo = makeRepo({ findOne: jest.fn().mockResolvedValue(null) });

    const result = await repo.findById('session-1');

    expect(result).toBeNull();
  });

  it('findById maps domain when found', async () => {
    const orm = new OrmSession();
    orm.id = 'session-1';
    orm.userId = 'user-1';
    orm.deviceId = 'device-1';
    orm.deviceName = null;
    orm.userAgent = null;
    orm.ipAddress = null;
    orm.refreshTokenHash = 'hash';
    orm.createdAt = new Date('2026-01-01T00:00:00Z');
    orm.lastSeenAt = new Date('2026-01-02T00:00:00Z');
    orm.revokedAt = null;
    orm.expiresAt = new Date('2026-02-01T00:00:00Z');

    const repo = makeRepo({ findOne: jest.fn().mockResolvedValue(orm) });

    const mapperSpy = jest.spyOn(SessionMapper, 'toDomain');
    const result = await repo.findById('session-1');

    expect(mapperSpy).toHaveBeenCalledWith(orm);
    expect(result?.id).toBe('session-1');
  });

  it('save maps and persists', async () => {
    const orm = new OrmSession();
    orm.id = 'session-1';
    orm.userId = 'user-1';
    orm.deviceId = 'device-1';
    orm.deviceName = null;
    orm.userAgent = null;
    orm.ipAddress = null;
    orm.refreshTokenHash = 'hash';
    orm.createdAt = new Date('2026-01-01T00:00:00Z');
    orm.lastSeenAt = new Date('2026-01-02T00:00:00Z');
    orm.revokedAt = null;
    orm.expiresAt = new Date('2026-02-01T00:00:00Z');

    const repo = makeRepo({
      create: jest.fn().mockReturnValue(orm),
      save: jest.fn().mockResolvedValue(orm),
    });

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

    const mapperSpy = jest.spyOn(SessionMapper, 'toDomain');
    const result = await repo.save(domain);

    expect(mapperSpy).toHaveBeenCalled();
    expect(result.id).toBe('session-1');
  });

  it('updateLastSeen delegates to update', async () => {
    const repo = makeRepo({ update: jest.fn().mockResolvedValue(undefined) });

    await repo.updateLastSeen('session-1', new Date('2026-01-02T00:00:00Z'));

    expect(repo['ormRepository'].update).toHaveBeenCalled();
  });

  it('updateRefreshTokenHash delegates to update', async () => {
    const repo = makeRepo({ update: jest.fn().mockResolvedValue(undefined) });

    await repo.updateRefreshTokenHash('session-1', 'hash', new Date('2026-02-01T00:00:00Z'));

    expect(repo['ormRepository'].update).toHaveBeenCalled();
  });

  it('revoke delegates to update', async () => {
    const repo = makeRepo({ update: jest.fn().mockResolvedValue(undefined) });

    await repo.revoke('session-1', new Date('2026-01-03T00:00:00Z'));

    expect(repo['ormRepository'].update).toHaveBeenCalled();
  });

  it('revokeAllForUser uses query builder', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo({
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute,
      }),
    });

    await repo.revokeAllForUser('user-1', new Date('2026-01-03T00:00:00Z'));

    expect(execute).toHaveBeenCalled();
  });
});
