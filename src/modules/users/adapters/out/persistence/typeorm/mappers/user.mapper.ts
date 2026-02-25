import { User as DomainUser } from '../../../../../domain/entities/user.entity';
import { UserFactory } from '../../../../../domain/factories/user.factory';
import { Email } from '../../../../../domain/value-objects/email.vo';
import { Password } from '../../../../../domain/value-objects/password.vo';
import { RoleId } from '../../../../../domain/value-objects/role.vo';
import { User as OrmUser } from '../entities/user.entity';
import { MissingRoleIdError } from '../../../../../domain/errors/missing-role-id.error';

export class UserMapper {
  static toDomain(orm: OrmUser): DomainUser {
    const roleId = orm.role?.roleId ?? (orm as any).roleId;
    if (!roleId) {
      throw new MissingRoleIdError();
    }

    return UserFactory.reconstitute({
      id: orm.id,
      name: orm.name,
      email: new Email(orm.email),
      password: new Password(orm.password),
      roleId: new RoleId(roleId),
      deleted: orm.deleted,
      avatarUrl: orm.avatarUrl,
      createdAt: orm.createdAt,
    });
  }

  static toPersistence(domain: DomainUser): Partial<OrmUser> {
    return {
      id: domain.id,
      name: domain.name,
      email: domain.email.value,
      password: domain.password.value,
      deleted: domain.deleted,
      avatarUrl: domain.avatarUrl,
      role: domain.roleId ? ({ roleId: domain.roleId.value } as OrmUser['role']) : undefined,
      createdAt: domain.createdAt,
    };
  }
}


