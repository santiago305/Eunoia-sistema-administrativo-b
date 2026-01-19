import { RoleFactory } from './role.factory';

describe('RoleFactory', () => {
  it('creates a new role without id', () => {
    const role = RoleFactory.createNew({
      description: 'admin',
    });

    expect(role.id).toBeUndefined();
    expect(role.description).toBe('admin');
    expect(role.deleted).toBe(false);
    expect(role.createdAt).toBeUndefined();
  });

  it('reconstitutes a role with id', () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');

    const role = RoleFactory.reconstitute({
      id: 'role-1',
      description: 'admin',
      deleted: false,
      createdAt,
    });

    expect(role.id).toBe('role-1');
    expect(role.description).toBe('admin');
    expect(role.deleted).toBe(false);
    expect(role.createdAt?.toISOString()).toBe(
      '2024-01-01T00:00:00.000Z'
    );
  });
});
