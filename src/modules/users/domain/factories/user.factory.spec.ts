import { UserFactory } from './user.factory';
import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';
import { RoleId } from '../value-objects/role.vo';

describe('UserFactory', () => {
  it('creates a new user without id', () => {
    const user = UserFactory.createNew({
      name: 'Ana',
      email: new Email('ana@example.com'),
      password: new Password('hash'),
      roleId: new RoleId('role-1'),
      avatarUrl: 'avatar.png',
    });

    expect(user.id).toBeUndefined();
    expect(user.name).toBe('Ana');
    expect(user.email.value).toBe('ana@example.com');
    expect(user.roleId.value).toBe('role-1');
  });

  it('reconstitutes a user with id', () => {
    const user = UserFactory.reconstitute({
      id: 'user-1',
      name: 'Ana',
      email: new Email('ana@example.com'),
      password: new Password('hash'),
      roleId: new RoleId('role-1'),
      deleted: false,
      avatarUrl: 'avatar.png',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    });

    expect(user.id).toBe('user-1');
    expect(user.deleted).toBe(false);
    expect(user.createdAt?.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });
});
