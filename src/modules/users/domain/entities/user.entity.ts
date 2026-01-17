import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';
import { RoleId } from '../value-objects/role.vo';

export class User {
  constructor(
    public readonly id: string,
    public name: string,
    public email: Email,
    public password: Password,
    public roleId: RoleId,
    public deleted: boolean = false,
    public avatarUrl?: string,
    public createdAt?: Date
  ) {}
}
