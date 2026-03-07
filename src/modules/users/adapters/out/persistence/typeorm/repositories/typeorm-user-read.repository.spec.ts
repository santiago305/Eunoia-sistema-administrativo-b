import { Repository } from 'typeorm';
import { TypeormUserReadRepository } from './typeorm-user-read.repository';
import { User as OrmUser } from '../entities/user.entity';

describe('TypeormUserReadRepository', () => {
  const makeRepo = (overrides?: Partial<Repository<OrmUser>>) => {
    return new TypeormUserReadRepository(overrides as Repository<OrmUser>);
  };

  it('findPublicByEmail returns mapped shape', async () => {
    const repo = makeRepo({
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          user_id: 'user-1',
          user_email: 'ana@example.com',
          role_description: 'admin',
        }),
      }),
    });

    const result = await repo.findPublicByEmail('ana@example.com');
    expect(result).toEqual({
      id: 'user-1',
      email: 'ana@example.com',
      roleDescription: 'admin',
    });
  });

  it('listUsers returns raw rows', async () => {
    const repo = makeRepo({
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ id: 'user-1', email: 'ana@example.com' }]),
      }),
    });

    const result = await repo.listUsers({ page: 1 });
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(15);
    expect(result.items[0]).toEqual(
      expect.objectContaining({ id: 'user-1', email: 'ana@example.com' }),
    );
  });

  it('countUsersByRole returns grouped totals', async () => {
    const repo = makeRepo({
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { role: 'admin', total: '2' },
          { role: 'adviser', total: '3' },
        ]),
      }),
    });

    const result = await repo.countUsersByRole({ status: 'all' });
    expect(result).toEqual({
      total: 5,
      byRole: {
        admin: 2,
        adviser: 3,
      },
    });
  });

  it('findPublicById returns null when role missing', async () => {
    const repo = makeRepo({
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'user-1' }),
      }),
    });

    const result = await repo.findPublicById('user-1');
    expect(result).toBeNull();
  });

  it('findWithPasswordByEmail returns null when not found', async () => {
    const repo = makeRepo({
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }),
    });

    const result = await repo.findWithPasswordByEmail('ana@example.com');
    expect(result).toBeNull();
  });
});
