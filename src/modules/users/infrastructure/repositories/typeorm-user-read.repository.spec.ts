import { Repository } from 'typeorm';
import { TypeormUserReadRepository } from './typeorm-user-read.repository';
import { User as OrmUser } from '../orm-entities/user.entity';

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
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ id: 'user-1', email: 'ana@example.com' }]),
      }),
    });

    const result = await repo.listUsers({ page: 1 });
    expect(result).toEqual([{ id: 'user-1', email: 'ana@example.com' }]);
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
