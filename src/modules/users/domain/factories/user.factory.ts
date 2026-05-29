import { User } from '../entities/user.entity';
import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';
import { RoleId } from '../value-objects/role.vo';

export class UserFactory {
  static createNew(params: {
    name: string;
    email: Email;
    password: Password;
    roleId: RoleId | null;
    avatarUrl?: string;
    telefono?: string;
    preferredHomePath?: string | null;
    createdByUserId?: string | null;
    manageableRoleDescriptions?: string[] | null;
    manageableUserIds?: string[] | null;
  }): User {
    return new User(
      undefined,
      params.name,
      params.email,
      params.password,
      params.roleId,
      false,
      params.avatarUrl,
      undefined,
      params.telefono,
      params.preferredHomePath,
      params.createdByUserId ?? null,
      params.manageableRoleDescriptions ?? null,
      params.manageableUserIds ?? null,
    );
  }

  static reconstitute(params: {
    id: string;
    name: string;
    email: Email;
    password: Password;
    roleId: RoleId | null;
    deleted: boolean;
    avatarUrl?: string;
    createdAt?: Date;
    telefono?: string;
    preferredHomePath?: string | null;
    createdByUserId?: string | null;
    manageableRoleDescriptions?: string[] | null;
    manageableUserIds?: string[] | null;
  }): User {
    return new User(
      params.id,
      params.name,
      params.email,
      params.password,
      params.roleId,
      params.deleted,
      params.avatarUrl,
      params.createdAt,
      params.telefono,
      params.preferredHomePath,
      params.createdByUserId ?? null,
      params.manageableRoleDescriptions ?? null,
      params.manageableUserIds ?? null,
    );
  }
}
