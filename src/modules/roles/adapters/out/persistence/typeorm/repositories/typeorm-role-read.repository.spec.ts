import { Repository } from 'typeorm';
import { TypeormRoleReadRepository } from './typeorm-role-read.repository';
import { Role as OrmRole } from '../entities/role.entity';

describe('TypeormRoleReadRepository', () => {
  const makeQueryBuilder = () => {
    const queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
    };
    return queryBuilder;
  };

  const makeRepo = (queryBuilder: ReturnType<typeof makeQueryBuilder>) => {
    const ormRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<OrmRole>;
    return {
      repo: new TypeormRoleReadRepository(ormRepository),
      ormRepository,
    };
  };

  it('listRoles returns all roles when status is all', async () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const queryBuilder = makeQueryBuilder();
    queryBuilder.getRawMany.mockResolvedValue([
      { id: 'role-1', description: 'admin', deleted: false, createdAt, createdByUserId: null, createdByUserName: null },
      { id: 'role-2', description: 'user', deleted: true, createdAt, createdByUserId: 'u-1', createdByUserName: 'Ana' },
    ]);
    const { repo, ormRepository } = makeRepo(queryBuilder);

    const result = await repo.listRoles({ status: 'all' });

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('role');
    expect(queryBuilder.where).not.toHaveBeenCalled();
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('role.description', 'ASC');
    expect(result).toEqual([
      { id: 'role-1', description: 'admin', deleted: false, createdAt, createdByUserId: null, createdByUserName: null },
      { id: 'role-2', description: 'user', deleted: true, createdAt, createdByUserId: 'u-1', createdByUserName: 'Ana' },
    ]);
  });

  it('listRoles filters active roles', async () => {
    const queryBuilder = makeQueryBuilder();
    queryBuilder.getRawMany.mockResolvedValue([]);
    const { repo } = makeRepo(queryBuilder);

    await repo.listRoles({ status: 'active' });

    expect(queryBuilder.where).toHaveBeenCalledWith('role.deleted = false');
  });

  it('listRoles filters inactive roles', async () => {
    const queryBuilder = makeQueryBuilder();
    queryBuilder.getRawMany.mockResolvedValue([]);
    const { repo } = makeRepo(queryBuilder);

    await repo.listRoles({ status: 'inactive' });

    expect(queryBuilder.where).toHaveBeenCalledWith('role.deleted = true');
  });

  it('findById returns role when exists', async () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const queryBuilder = makeQueryBuilder();
    queryBuilder.getRawOne.mockResolvedValue({
      id: 'role-1',
      description: 'admin',
      deleted: false,
      createdAt,
      createdByUserId: null,
      createdByUserName: null,
    });
    const { repo } = makeRepo(queryBuilder);

    const result = await repo.findById('role-1');

    expect(queryBuilder.where).toHaveBeenCalledWith('role.roleId = :id', { id: 'role-1' });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('role.deleted = false');
    expect(result).toEqual({
      id: 'role-1',
      description: 'admin',
      deleted: false,
      createdAt,
      createdByUserId: null,
      createdByUserName: null,
    });
  });

  it('findById returns null when not found', async () => {
    const queryBuilder = makeQueryBuilder();
    queryBuilder.getRawOne.mockResolvedValue(null);
    const { repo } = makeRepo(queryBuilder);

    const result = await repo.findById('role-1');
    expect(result).toBeNull();
  });
});
