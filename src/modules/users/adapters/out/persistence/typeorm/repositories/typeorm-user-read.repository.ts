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
      rol: string;
      roleId: string;
      deleted: boolean;
      createdAt: Date;
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

    const query = this.ormRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select([
        'user.id AS id',
        'user.name AS name',
        'user.email AS email',
        'user.telefono AS telefono',
        'role.description AS rol',
        'role.roleId AS roleId',
        'user.deleted AS deleted',
        'user.createdAt AS createdAt',
      ])
      .skip(offset)
      .take(pageSize);

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

    if (params.filters?.allowedRoles && params.filters.allowedRoles.length > 0) {
      query.andWhere('role.description IN (:...allowedRoles)', {
        allowedRoles: params.filters.allowedRoles,
      });
    }

    if (params.filters?.q) {
      query.andWhere('(LOWER(user.name) LIKE :q OR LOWER(user.email) LIKE :q)', {
        q: `%${params.filters.q.toLowerCase()}%`,
      });
    }

    const total = await query.clone().getCount();
    query.orderBy(sortBy, order);
    const items = await query.getRawMany();

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

    if (params.filters?.allowedRoles && params.filters.allowedRoles.length > 0) {
      query.andWhere('role.description IN (:...allowedRoles)', {
        allowedRoles: params.filters.allowedRoles,
      });
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
    roleDescription: string;
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
    roleDescription: string;
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
    role: { id: string; description: string };
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

    if (!user || !user.role) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      telefono: user.telefono,
      deleted: user.deleted,
      avatarUrl: this.normalizeAvatarUrl(user.avatarUrl),
      createdAt: user.createdAt,
      role: {
        id: user.role.roleId,
        description: user.role.description,
      },
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
    role: { id: string; description: string };
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
      .getOne();

    if (!user || !user.role) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      telefono: user.telefono,
      deleted: user.deleted,
      avatarUrl: this.normalizeAvatarUrl(user.avatarUrl),
      createdAt: user.createdAt,
      role: {
        id: user.role.roleId,
        description: user.role.description,
      },
    };
  }

  async findWithPasswordByEmail(email: string): Promise<{
    id: string;
    email: string;
    password: string;
    roleDescription: string;
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
        'role.description',
      ])
      .where('user.email = :email', { email })
      .andWhere('user.deleted = false')
      .getOne();

    if (!user || !user.role) return null;

    return {
      id: user.id,
      email: user.email,
      password: user.password,
      roleDescription: user.role.description,
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

