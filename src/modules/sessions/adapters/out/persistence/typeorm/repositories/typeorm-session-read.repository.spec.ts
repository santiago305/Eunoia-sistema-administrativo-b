import { Repository } from 'typeorm';
import { TypeormSessionReadRepository } from './typeorm-session-read.repository';
import { Session as OrmSession } from '../entities/session.entity';

describe('TypeormSessionReadRepository', () => {
  const makeRepo = (overrides?: Partial<Repository<OrmSession>>) => {
    return new TypeormSessionReadRepository(overrides as Repository<OrmSession>);
  };

  it('listUserSessions returns mapped rows', async () => {
    const repo = makeRepo({
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 's1',
            userId: 'user-1',
            deviceId: 'device-1',
            deviceName: null,
            userAgent: null,
            ipAddress: null,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            lastSeenAt: new Date('2026-01-02T00:00:00Z'),
            revokedAt: null,
            expiresAt: new Date('2026-02-01T00:00:00Z'),
          },
        ]),
      }),
    });

    const result = await repo.listUserSessions('user-1');

    expect(result).toEqual([
      {
        id: 's1',
        userId: 'user-1',
        deviceId: 'device-1',
        deviceName: null,
        userAgent: null,
        ipAddress: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        lastSeenAt: new Date('2026-01-02T00:00:00Z'),
        revokedAt: null,
        expiresAt: new Date('2026-02-01T00:00:00Z'),
      },
    ]);
  });

  it('listUserSessions respects include flags', async () => {
    const andWhere = jest.fn().mockReturnThis();
    const repo = makeRepo({
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere,
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    });

    await repo.listUserSessions('user-1', { includeRevoked: true, includeExpired: true });

    expect(andWhere).not.toHaveBeenCalled();
  });

  it('findById returns null when not found', async () => {
    const repo = makeRepo({ findOne: jest.fn().mockResolvedValue(null) });

    const result = await repo.findById('s1');

    expect(result).toBeNull();
  });

  it('findAuthById returns auth shape', async () => {
    const repo = makeRepo({
      findOne: jest.fn().mockResolvedValue({
        id: 's1',
        userId: 'user-1',
        refreshTokenHash: 'hash',
        revokedAt: null,
        expiresAt: new Date('2026-02-01T00:00:00Z'),
      }),
    });

    const result = await repo.findAuthById('s1');

    expect(result).toEqual({
      id: 's1',
      userId: 'user-1',
      refreshTokenHash: 'hash',
      revokedAt: null,
      expiresAt: new Date('2026-02-01T00:00:00Z'),
    });
  });
});
