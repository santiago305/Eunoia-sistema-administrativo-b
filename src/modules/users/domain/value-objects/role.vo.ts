import { InvalidRoleIdError } from '../errors/invalid-role-id.error';

export class RoleId {
  public readonly value: string;

  constructor(value: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new InvalidRoleIdError();
    }
    this.value = normalized;
  }
}
