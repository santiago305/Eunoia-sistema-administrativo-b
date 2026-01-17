import { User } from '../entities/user.entity';
import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';
import { RoleId } from '../value-objects/role.vo';

export class UserFactory {
  static createNew(params: {
    name: string;
    email: Email;
    password: Password;
    roleId: RoleId;
    avatarUrl?: string;
  }): User {
    return new User(
      undefined,
      params.name,
      params.email,
      params.password,
      params.roleId,
      false,
      params.avatarUrl
    );
  }

  static reconstitute(params: {
    id: string;
    name: string;
    email: Email;
    password: Password;
    roleId: RoleId;
    deleted: boolean;
    avatarUrl?: string;
    createdAt?: Date;
  }): User {
    return new User(
      params.id,
      params.name,
      params.email,
      params.password,
      params.roleId,
      params.deleted,
      params.avatarUrl,
      params.createdAt
    );
  }
}
