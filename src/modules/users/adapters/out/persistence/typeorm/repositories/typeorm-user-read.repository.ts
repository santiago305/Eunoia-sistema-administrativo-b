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
    filters?: { role?: string };
    sortBy?: string;
    order?: 'ASC' | 'DESC';
    status?: UserListStatus;
  }): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      rol: string;
      roleId: string;
      deleted: boolean;
      createdAt: Date;
    }>
  > {
    const pageSize = 20;
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
      roleId: 'role.id',
      deleted: 'user.deleted',
      'user.deleted': 'user.deleted',
    };
    const sortBy = sortByMap[sortByKey] ?? 'user.createdAt';
    const order = params.order === 'ASC' ? 'ASC' : 'DESC';

    const query = this.ormRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'role.description As rol',
        'role.id As roleId',
        'user.deleted',
        'user.createdAt',
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

    query.orderBy(sortBy, order);

    return query.getRawMany();
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

  async findPublicById(id: string): Promise<{
    id: string;
    name: string;
    email: string;
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
        'user.deleted',
        'user.avatarUrl',
        'user.createdAt',
        'role.id',
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
      deleted: user.deleted,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      role: {
        id: user.role.id,
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
}
