import { RoleMapper } from './role.mapper';
import { Role as OrmRole } from '../entities/role.entity';
import { RoleFactory } from '../../../../../domain/factories/role.factory';

describe('RoleMapper', () => {
  it('maps orm role to domain role', () => {
    const orm = new OrmRole();
    orm.roleId = 'role-1';
    orm.description = 'admin';
    orm.deleted = false;
    orm.createdAt = new Date('2024-01-01T00:00:00.000Z');

    const domain = RoleMapper.toDomain(orm);

    expect(domain.id).toBe('role-1');
    expect(domain.description).toBe('admin');
    expect(domain.deleted).toBe(false);
    expect(domain.createdAt?.toISOString()).toBe(
      '2024-01-01T00:00:00.000Z'
    );
  });

  it('maps domain role to persistence shape', () => {
    const domain = RoleFactory.reconstitute({
      id: 'role-1',
      description: 'admin',
      deleted: false,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    });

    const persistence = RoleMapper.toPersistence(domain);

    expect(persistence.roleId).toBe('role-1');
    expect(persistence.description).toBe('admin');
    expect(persistence.deleted).toBe(false);
    expect(persistence.createdAt?.toISOString()).toBe(
      '2024-01-01T00:00:00.000Z'
    );
  });
});
