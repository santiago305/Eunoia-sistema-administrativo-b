import { Repository } from 'typeorm';
import { TypeormRoleRepository } from './typeorm-role.repository';
import { Role as OrmRole } from '../entities/role.entity';
import { RoleFactory } from '../../../../../domain/factories/role.factory';

describe('TypeormRoleRepository', () => {
  const makeRepo = (overrides?: Partial<Repository<OrmRole>>) => {
    return new TypeormRoleRepository(overrides as Repository<OrmRole>);
  };

  it('save calls ormRepository.save and returns saved role', async () => {
    const role = RoleFactory.reconstitute({
      id: 'role-1',
      description: 'admin',
      deleted: false,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    });
    const savedOrm = {
      roleId: 'role-1',
      description: 'admin',
      deleted: false,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    } as OrmRole;

    const repo = makeRepo({
      create: jest.fn((payload?: any) => payload as OrmRole) as any,
      save: jest.fn().mockResolvedValue(savedOrm),
    });

    const result = await repo.save(role);

    expect(result.id).toBe('role-1');
    expect(result.description).toBe('admin');
    expect(repo['ormRepository'].create).toHaveBeenCalledWith({
      roleId: 'role-1',
      description: 'admin',
      deleted: false,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    });
    expect(repo['ormRepository'].save).toHaveBeenCalled();
  });

  it('findById returns role when found', async () => {
    const role = {
      roleId: 'role-1',
      description: 'admin',
      deleted: false,
    } as OrmRole;

    const repo = makeRepo({
      findOne: jest.fn().mockResolvedValue(role),
    });

    const result = await repo.findById('role-1');

    expect(result?.id).toBe('role-1');
    expect(result?.description).toBe('admin');
    expect(repo['ormRepository'].findOne).toHaveBeenCalledWith({
      where: { roleId: 'role-1' },
    });
  });

  it('findById returns null when not found', async () => {
    const repo = makeRepo({
      findOne: jest.fn().mockResolvedValue(null),
    });

    const result = await repo.findById('role-404');

    expect(result).toBeNull();
  });

  it('update calls ormRepository.save and returns updated role', async () => {
    const role = RoleFactory.reconstitute({
      id: 'role-1',
      description: 'admin updated',
      deleted: false,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    });
    const savedOrm = {
      roleId: 'role-1',
      description: 'admin updated',
      deleted: false,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    } as OrmRole;

    const repo = makeRepo({
      create: jest.fn((payload?: any) => payload as OrmRole) as any,
      save: jest.fn().mockResolvedValue(savedOrm),
    });

    const result = await repo.update(role);

    expect(result.id).toBe('role-1');
    expect(result.description).toBe('admin updated');
    expect(repo['ormRepository'].save).toHaveBeenCalled();
  });

  it('updateDeleted calls ormRepository.update with correct values', async () => {
    const repo = makeRepo({
      update: jest.fn().mockResolvedValue(undefined),
    });

    await repo.updateDeleted('role-1', true);

    expect(repo['ormRepository'].update).toHaveBeenCalledWith('role-1', {
      deleted: true,
    });
  });
});
