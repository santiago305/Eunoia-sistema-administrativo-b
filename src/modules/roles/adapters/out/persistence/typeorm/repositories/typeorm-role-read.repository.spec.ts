import { Repository } from 'typeorm';
import { TypeormRoleReadRepository } from './typeorm-role-read.repository';
import { Role as OrmRole } from '../entities/role.entity';

describe('TypeormRoleReadRepository', () => {
  const makeRepo = (overrides?: Partial<Repository<OrmRole>>) => {
    return new TypeormRoleReadRepository(overrides as Repository<OrmRole>);
  };

  it('listRoles returns id and description only', async () => {
    const repo = makeRepo({
      find: jest.fn().mockResolvedValue([
        { id: 'role-1', description: 'admin' },
        { id: 'role-2', description: 'user' },
      ]),
    });

    const result = await repo.listRoles();

    expect(result).toEqual([
      { id: 'role-1', description: 'admin' },
      { id: 'role-2', description: 'user' },
    ]);
  });

  it('findById returns role when exists', async () => {
    const createdAt = new Date('2024-01-01');

    const repo = makeRepo({
      findOne: jest.fn().mockResolvedValue({
        id: 'role-1',
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
