import { Repository } from 'typeorm';
import { TypeormRoleReadRepository } from './typeorm-role-read.repository';
import { Role as OrmRole } from '../entities/role.entity';

describe('TypeormRoleReadRepository', () => {
  const makeRepo = (overrides?: Partial<Repository<OrmRole>>) => {
    return new TypeormRoleReadRepository(overrides as Repository<OrmRole>);
  };

  it('listRoles returns all roles when status is all', async () => {
    const find = jest.fn().mockResolvedValue([
      { roleId: 'role-1', description: 'admin', deleted: false, createdAt: undefined },
      { roleId: 'role-2', description: 'user', deleted: true, createdAt: undefined },
    ]);
    const repo = makeRepo({ find });

    const result = await repo.listRoles({ status: 'all' });

    expect(find).toHaveBeenCalledWith({
      select: ['roleId', 'description', 'deleted', 'createdAt'],
      order: { description: 'ASC' },
    });
    expect(result).toEqual([
      { id: 'role-1', description: 'admin', deleted: false, createdAt: undefined },
      { id: 'role-2', description: 'user', deleted: true, createdAt: undefined },
    ]);
  });

  it('listRoles filters active roles', async () => {
    const find = jest.fn().mockResolvedValue([]);
    const repo = makeRepo({ find });

    await repo.listRoles({ status: 'active' });

    expect(find).toHaveBeenCalledWith({
      select: ['roleId', 'description', 'deleted', 'createdAt'],
      where: { deleted: false },
      order: { description: 'ASC' },
    });
  });

  it('listRoles filters inactive roles', async () => {
    const find = jest.fn().mockResolvedValue([]);
    const repo = makeRepo({ find });

    await repo.listRoles({ status: 'inactive' });

    expect(find).toHaveBeenCalledWith({
      select: ['roleId', 'description', 'deleted', 'createdAt'],
      where: { deleted: true },
      order: { description: 'ASC' },
    });
  });

  it('findById returns role when exists', async () => {
    const createdAt = new Date('2024-01-01');

    const repo = makeRepo({
      findOne: jest.fn().mockResolvedValue({
        roleId: 'role-1',
        description: 'admin',
        deleted: false,
        createdAt,
      }),
    });

    const result = await repo.findById('role-1');

    expect(result).toEqual({
      id: 'role-1',
      description: 'admin',
      deleted: false,
      createdAt,
    });
  });

  it('findById returns null when not found', async () => {
    const repo = makeRepo({
      findOne: jest.fn().mockResolvedValue(null),
    });

    const result = await repo.findById('role-1');
    expect(result).toBeNull();
  });
});
