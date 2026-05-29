import { User as OrmUser } from '../entities/user.entity';
import { UserMapper } from './user.mapper';
import { UserFactory } from '../../../../../domain/factories/user.factory';
import { Email } from '../../../../../domain/value-objects/email.vo';
import { Password } from '../../../../../domain/value-objects/password.vo';
import { RoleId } from '../../../../../domain/value-objects/role.vo';

describe('UserMapper', () => {
  it('maps orm user to domain user', () => {
    const orm = new OrmUser();
    orm.id = 'user-1';
    orm.name = 'Ana';
    orm.email = 'ana@example.com';
    orm.password = 'hash';
    orm.deleted = false;
    orm.avatarUrl = 'avatar.png';
    orm.createdAt = new Date('2024-01-01T00:00:00.000Z');
    orm.role = { roleId: 'role-1' } as any;

    const domain = UserMapper.toDomain(orm);

    expect(domain.id).toBe('user-1');
    expect(domain.email.value).toBe('ana@example.com');
    expect(domain.roleId.value).toBe('role-1');
  });

  it('maps orm user with missing role id to domain user with null roleId', () => {
    const orm = new OrmUser();
    orm.id = 'user-1';
    orm.name = 'Ana';
    orm.email = 'ana@example.com';
    orm.password = 'hash';
    orm.deleted = false;

    const domain = UserMapper.toDomain(orm);
    expect(domain.roleId).toBeNull();
  });

  it('maps domain user to persistence shape', () => {
    const domain = UserFactory.reconstitute({
      id: 'user-1',
      name: 'Ana',
      email: new Email('ana@example.com'),
      password: new Password('hash'),
      roleId: new RoleId('role-1'),
      deleted: false,
      avatarUrl: 'avatar.png',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    });

    const persistence = UserMapper.toPersistence(domain);

    expect(persistence.email).toBe('ana@example.com');
    expect((persistence.role as any).roleId).toBe('role-1');
  });
});


