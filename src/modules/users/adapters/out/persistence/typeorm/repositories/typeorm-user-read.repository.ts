import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserListStatus,
  UserReadRepository
} from '../../../../../application/ports/user-read.repository';
import { User as OrmUser } from '../entities/user.entity';

@Injectable()
export class TypeormUserReadRepository implements UserReadRepository {
  constructor(
    @InjectRepository(OrmUser)
    private readonly ormRepository: Repository<OrmUser>
  ) {}

  async listUsers(params: {
    page?: number;
    filters?: {
      role?: string;
      q?: string;
      allowedRoles?: string[];
      allowedUserIds?: string[];
    };
    sortBy?: string;
    order?: 'ASC' | 'DESC';
    status?: UserListStatus;
  }): Promise<{
    items: Array<{
      id: string;
      name: string;
      email: string;
      telefono?: string;
      rol: string | null;
      roleId: string | null;
      deleted: boolean;
      createdAt: Date;
      updatedAt?: Date;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }> {
    const pageSize = 15;
    const page = params.page ?? 1;
    const offset = (page - 1) * pageSize;
    // Whitelist de columnas para evitar inyeccion en orderBy
    const sortByKey = (params.sortBy ?? 'user.createdAt').toLowerCase();
    const sortByMap: Record<string, string> = {
      name: 'user.name',
      'user.name': 'user.name',
      email: 'user.email',
      'user.email': 'user.email',
      createdat: 'user.createdAt',
      'user.createdat': 'user.createdAt',
      role: 'role.description',
      rol: 'role.description',
      'role.description': 'role.description',
      roleId: 'role.roleId',
      deleted: 'user.deleted',
      'user.deleted': 'user.deleted',
    };
    const sortBy = sortByMap[sortByKey] ?? 'user.createdAt';
    const order = params.order === 'ASC' ? 'ASC' : 'DESC';

    const baseQuery = this.ormRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .leftJoin(OrmUser, 'creator', 'creator.id = user.createdByUserId');

    const status = params.status ?? 'all';
    if (status === 'active') {
      baseQuery.where('user.deleted = false');
    } else if (status === 'inactive') {
      baseQuery.where('user.deleted = true');
    } else {
      baseQuery.where('1=1');
    }

    if (params.filters?.role) {
      baseQuery.andWhere('role.description = :role', { role: params.filters.role });
    }

    if (
      (params.filters?.allowedRoles && params.filters.allowedRoles.length > 0)
      || (params.filters?.allowedUserIds && params.filters.allowedUserIds.length > 0)
    ) {
      if (params.filters?.allowedRoles?.length && params.filters?.allowedUserIds?.length) {
        baseQuery.andWhere('(role.description IN (:...allowedRoles) OR user.id IN (:...allowedUserIds))', {
          allowedRoles: params.filters.allowedRoles,
          allowedUserIds: params.filters.allowedUserIds,
        });
      } else if (params.filters?.allowedRoles?.length) {
        baseQuery.andWhere('role.description IN (:...allowedRoles)', {
          allowedRoles: params.filters.allowedRoles,
        });
      } else if (params.filters?.allowedUserIds?.length) {
        baseQuery.andWhere('user.id IN (:...allowedUserIds)', {
          allowedUserIds: params.filters.allowedUserIds,
        });
      }
    }

    if (params.filters?.q) {
      baseQuery.andWhere('(LOWER(user.name) LIKE :q OR LOWER(user.email) LIKE :q)', {
        q: `%${params.filters.q.toLowerCase()}%`,
      });
    }

    const total = await baseQuery.clone().getCount();

    const rawItems = await baseQuery
      .clone()
      .select([
        'user.id AS id',
        'user.name AS name',
        'user.email AS email',
        'user.telefono AS telefono',
        'role.description AS rol',
        'role.roleId AS roleId',
        'user.deleted AS deleted',
        'user.createdAt AS "createdAt"',
        'user.updatedAt AS "updatedAt"',
        'user.createdByUserId AS "createdByUserId"',
        'creator.name AS "createdByUserName"',
        'user.manageableRoleDescriptions AS "manageableRoleDescriptions"',
        'user.manageableUserIds AS "manageableUserIds"',
      ])
      .orderBy(sortBy, order)
      .offset(offset)
      .limit(pageSize)
      .getRawMany();

    const items = rawItems.map((item) => ({
      ...item,
      createdAt: (item as { createdAt?: Date; createdat?: Date }).createdAt
        ?? (item as { createdAt?: Date; createdat?: Date }).createdat,
      updatedAt: (item as { updatedAt?: Date; updatedat?: Date }).updatedAt
        ?? (item as { updatedAt?: Date; updatedat?: Date }).updatedat,
      createdByUserId: (item as { createdByUserId?: string | null }).createdByUserId ?? null,
      createdByUserName: (item as { createdByUserName?: string | null }).createdByUserName ?? null,
      manageableRoleDescriptions:
        (item as { manageableRoleDescriptions?: string[] | null }).manageableRoleDescriptions ?? null,
      manageableUserIds: (item as { manageableUserIds?: string[] | null }).manageableUserIds ?? null,
    }));

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async countUsersByRole(params: {
    filters?: {
      role?: string;
      q?: string;
      allowedRoles?: string[];
      allowedUserIds?: string[];
    };
    status?: UserListStatus;
  }): Promise<{
    total: number;
    byRole: Record<string, number>;
  }> {
    const query = this.ormRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select('role.description', 'role')
      .addSelect('COUNT(user.id)', 'total');

    const status = params.status ?? 'all';
    if (status === 'active') {
      query.where('user.deleted = false');
    } else if (status === 'inactive') {
      query.where('user.deleted = true');
    } else {
      query.where('1=1');
    }

    if (params.filters?.role) {
      query.andWhere('role.description = :role', { role: params.filters.role });
    }

    if (
      (params.filters?.allowedRoles && params.filters.allowedRoles.length > 0)
      || (params.filters?.allowedUserIds && params.filters.allowedUserIds.length > 0)
    ) {
      if (params.filters?.allowedRoles?.length && params.filters?.allowedUserIds?.length) {
        query.andWhere('(role.description IN (:...allowedRoles) OR user.id IN (:...allowedUserIds))', {
          allowedRoles: params.filters.allowedRoles,
          allowedUserIds: params.filters.allowedUserIds,
        });
      } else if (params.filters?.allowedRoles?.length) {
        query.andWhere('role.description IN (:...allowedRoles)', {
          allowedRoles: params.filters.allowedRoles,
        });
      } else if (params.filters?.allowedUserIds?.length) {
        query.andWhere('user.id IN (:...allowedUserIds)', {
          allowedUserIds: params.filters.allowedUserIds,
        });
      }
    }

    if (params.filters?.q) {
      query.andWhere('(LOWER(user.name) LIKE :q OR LOWER(user.email) LIKE :q)', {
        q: `%${params.filters.q.toLowerCase()}%`,
      });
    }

    const rows = await query.groupBy('role.description').getRawMany<{ role: string; total: string }>();
    const byRole = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.role] = Number(row.total);
      return acc;
    }, {});
    const total = Object.values(byRole).reduce((sum, count) => sum + count, 0);

    return { total, byRole };
  }

  async findPublicByEmail(email: string): Promise<{
    id: string;
    email: string;
    roleDescription: string | null;
  } | null> {
    const user = await this.ormRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select(['user.id', 'user.email', 'role.description'])
      .where('user.email = :email', { email })
      .andWhere('user.deleted = false')
      .getRawOne();

    if (!user) return null;

    return {
      id: user.user_id,
      email: user.user_email,
      roleDescription: user.role_description,
    };
  }

  async findManagementByEmail(email: string): Promise<{
    id: string;
    email: string;
    roleDescription: string | null;
    deleted: boolean;
  } | null> {
    const user = await this.ormRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select(['user.id', 'user.email', 'user.deleted', 'role.description'])
      .where('user.email = :email', { email })
      .getRawOne();

    if (!user) return null;

    return {
      id: user.user_id,
      email: user.user_email,
      roleDescription: user.role_description,
      deleted: user.user_deleted,
    };
  }

  async findPublicById(id: string): Promise<{
    id: string;
    name: string;
    email: string;
    telefono?: string;
    deleted: boolean;
    avatarUrl?: string;
    createdAt?: Date;
    role: { id: string; description: string } | null;
  } | null> {
    const user = await this.ormRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.telefono',
        'user.deleted',
        'user.avatarUrl',
        'user.createdAt',
        'role.roleId',
        'role.description',
      ])
      .where('user.id = :id', { id })
      .andWhere('user.deleted = false')
      .getOne();

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      telefono: user.telefono,
      deleted: user.deleted,
      avatarUrl: this.normalizeAvatarUrl(user.avatarUrl),
      createdAt: user.createdAt,
      role: user.role
        ? {
            id: user.role.roleId,
            description: user.role.description,
          }
        : null,
    };
  }

  async findManagementById(id: string): Promise<{
    id: string;
    name: string;
    email: string;
    telefono?: string;
    deleted: boolean;
    avatarUrl?: string;
    createdAt?: Date;
    role: { id: string; description: string } | null;
    isSuperAdmin?: boolean;
    manageableRoleDescriptions?: string[] | null;
    manageableUserIds?: string[] | null;
  } | null> {
    const user = await this.ormRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.telefono',
        'user.deleted',
        'user.avatarUrl',
        'user.createdAt',
        'user.isSuperAdmin',
        'user.manageableRoleDescriptions',
        'user.manageableUserIds',
        'role.roleId',
        'role.description',
      ])
      .where('user.id = :id', { id })
      .getOne();

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      telefono: user.telefono,
      deleted: user.deleted,
      avatarUrl: this.normalizeAvatarUrl(user.avatarUrl),
      createdAt: user.createdAt,
      role: user.role
        ? {
            id: user.role.roleId,
            description: user.role.description,
          }
        : null,
      isSuperAdmin: Boolean(user.isSuperAdmin),
      manageableRoleDescriptions: user.manageableRoleDescriptions ?? null,
      manageableUserIds: user.manageableUserIds ?? null,
    };
  }

  async findManagementScopeById(id: string): Promise<{
    id: string;
    roleDescription: string | null;
    isSuperAdmin: boolean;
    manageableRoleDescriptions: string[] | null;
    manageableUserIds: string[] | null;
  } | null> {
    const row = await this.ormRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select([
        'user.id AS id',
        'user.isSuperAdmin AS "isSuperAdmin"',
        'user.manageableRoleDescriptions AS "manageableRoleDescriptions"',
        'user.manageableUserIds AS "manageableUserIds"',
        'role.description AS "roleDescription"',
      ])
      .where('user.id = :id', { id })
      .getRawOne<{
        id: string;
        isSuperAdmin: boolean;
        manageableRoleDescriptions: string[] | null;
        manageableUserIds: string[] | null;
        roleDescription: string | null;
      }>();

    if (!row) return null;

    return {
      id: row.id,
      roleDescription: row.roleDescription,
      isSuperAdmin: Boolean(row.isSuperAdmin),
      manageableRoleDescriptions: row.manageableRoleDescriptions ?? null,
      manageableUserIds: row.manageableUserIds ?? null,
    };
  }

  async findWithPasswordByEmail(email: string): Promise<{
    id: string;
    email: string;
    password: string;
    roleDescription: string | null;
    isSuperAdmin: boolean;
    failedLoginAttempts: number;
    lockoutLevel: number;
    lockedUntil: Date | null;
    securityDisabledAt: Date | null;
  } | null> {
    const user = await this.ormRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select([
        'user.id',
        'user.email',
        'user.password',
        'user.failedLoginAttempts',
        'user.lockoutLevel',
        'user.lockedUntil',
        'user.securityDisabledAt',
        'user.isSuperAdmin',
        'role.description',
      ])
      .where('user.email = :email', { email })
      .andWhere('user.deleted = false')
      .getOne();

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      password: user.password,
      roleDescription: user.role?.description ?? null,
      isSuperAdmin: Boolean(user.isSuperAdmin),
      failedLoginAttempts: user.failedLoginAttempts ?? 0,
      lockoutLevel: user.lockoutLevel ?? 0,
      lockedUntil: user.lockedUntil ?? null,
      securityDisabledAt: user.securityDisabledAt ?? null,
    };
  }

  private normalizeAvatarUrl(avatarUrl?: string) {
    if (!avatarUrl) return avatarUrl;
    if (avatarUrl.startsWith('/assets/')) {
      return avatarUrl.replace(/^\/assets\//, '/api/assets/');
    }
    return avatarUrl;
  }
}

