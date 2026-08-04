import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RoleListStatus,
  RoleReadRepository,
} from '../../../../../application/ports/role-read.repository';
import { Role as OrmRole } from '../entities/role.entity';
import { User as OrmUser } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';

@Injectable()
export class TypeormRoleReadRepository implements RoleReadRepository {
  constructor(
    @InjectRepository(OrmRole)
    private readonly ormRepository: Repository<OrmRole>
  ) {}

  async listRoles(params?: { status?: RoleListStatus }) {
    const status = params?.status ?? 'all';
    const query = this.ormRepository
      .createQueryBuilder('role')
      .leftJoin(OrmUser, 'creator', 'creator.id = role.createdByUserId')
      .select([
        'role.roleId AS id',
        'role.description AS description',
        'role.deleted AS deleted',
        'role.createdAt AS "createdAt"',
        'role.createdByUserId AS "createdByUserId"',
        'creator.name AS "createdByUserName"',
      ]);

    if (status === 'active') {
      query.where('role.deleted = false');
    } else if (status === 'inactive') {
      query.where('role.deleted = true');
    }

    const rows = await query
      .orderBy('role.description', 'ASC')
      .getRawMany<{
        id: string;
        description: string;
        deleted: boolean;
        createdAt: Date;
        createdByUserId: string | null;
        createdByUserName: string | null;
      }>();

    return rows.map((role) => ({
      id: role.id,
      description: role.description,
      deleted: role.deleted,
      createdAt: role.createdAt,
      createdByUserId: role.createdByUserId ?? null,
      createdByUserName: role.createdByUserName ?? null,
    }));
  }

  async findById(id: string) {
    const role = await this.ormRepository
      .createQueryBuilder('role')
      .leftJoin(OrmUser, 'creator', 'creator.id = role.createdByUserId')
      .select([
        'role.roleId AS id',
        'role.description AS description',
        'role.deleted AS deleted',
        'role.createdAt AS "createdAt"',
        'role.createdByUserId AS "createdByUserId"',
        'creator.name AS "createdByUserName"',
      ])
      .where('role.roleId = :id', { id })
      .andWhere('role.deleted = false')
      .getRawOne<{
        id: string;
        description: string;
        deleted: boolean;
        createdAt: Date;
        createdByUserId: string | null;
        createdByUserName: string | null;
      }>();

    if (!role) return null;

    return {
      id: role.id,
      description: role.description,
      deleted: role.deleted,
      createdAt: role.createdAt,
      createdByUserId: role.createdByUserId ?? null,
      createdByUserName: role.createdByUserName ?? null,
    };
  }
  async findByDescription(description: string, options?: { includeDeleted?: boolean }) {
    const query = this.ormRepository
      .createQueryBuilder('role')
      .leftJoin(OrmUser, 'creator', 'creator.id = role.createdByUserId')
      .select([
        'role.roleId AS id',
        'role.description AS description',
        'role.deleted AS deleted',
        'role.createdAt AS "createdAt"',
        'role.createdByUserId AS "createdByUserId"',
        'creator.name AS "createdByUserName"',
      ])
      .where('normalize_role_description(role.description) = normalize_role_description(:description)', { description });

    if (!options?.includeDeleted) {
      query.andWhere('role.deleted = false');
    }

    const role = await query.getRawOne<{
        id: string;
        description: string;
        deleted: boolean;
        createdAt: Date;
        createdByUserId: string | null;
        createdByUserName: string | null;
      }>();

    if (!role) return null;

    return {
      id: role.id,
      description: role.description,
      deleted: role.deleted,
      createdAt: role.createdAt,
      createdByUserId: role.createdByUserId ?? null,
      createdByUserName: role.createdByUserName ?? null,
    };
  }

  async existsByDescription(description: string) {
    return this.ormRepository
      .createQueryBuilder('role')
      .where('normalize_role_description(role.description) = normalize_role_description(:description)', { description })
      .andWhere('role.deleted = false')
      .getExists();
  }
}
