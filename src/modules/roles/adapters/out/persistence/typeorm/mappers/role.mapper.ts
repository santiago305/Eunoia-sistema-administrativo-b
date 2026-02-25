import { Role as DomainRole } from '../../../../../domain/entities/role.entity';
import { Role as OrmRole } from '../entities/role.entity';

export class RoleMapper {
  static toDomain(orm: OrmRole): DomainRole {
    return new DomainRole(
      orm.roleId,
      orm.description,
      orm.deleted,
      orm.createdAt
    );
  }

  static toPersistence(domain: DomainRole): Partial<OrmRole> {
    return {
      roleId: domain.id,
      description: domain.description,
      deleted: domain.deleted,
      createdAt: domain.createdAt,  
    };
  }
}
