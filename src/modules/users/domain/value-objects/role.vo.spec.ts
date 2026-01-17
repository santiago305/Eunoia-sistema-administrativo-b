import { RoleId } from './role.vo';
import { InvalidRoleIdError } from '../errors/invalid-role-id.error';

describe('RoleId', () => {
  it('stores value', () => {
    const roleId = new RoleId('role-1');
    expect(roleId.value).toBe('role-1');
  });

  it('throws on empty value', () => {
    expect(() => new RoleId('')).toThrow(InvalidRoleIdError);
  });
});
