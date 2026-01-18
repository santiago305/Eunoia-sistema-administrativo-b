import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserReadRepository } from '../../application/ports/user-read.repository';
import { User as OrmUser } from '../orm-entities/user.entity';

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
    whereClause?: string;
  }): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      rol: string;
      deleted: boolean;
      createdAt: Date;
    }>
  > {
    const pageSize = 20;
    const page = params.page ?? 1;
    const offset = (page - 1) * pageSize;
    const sortBy = params.sortBy ?? 'user.createdAt';
    const order = params.order ?? 'DESC';

    const query = this.ormRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'role.description As rol',
        'user.deleted',
        'user.createdAt',
      ])
      .skip(offset)
      .take(pageSize);

    if (params.whereClause) {
      query.where(params.whereClause);
    } else {
      query.where('1=1');
    }

    if (params.filters?.role) {
      query.andWhere('rol = :role', { role: params.filters.role });
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
  } | null> {
    const user = await this.ormRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select([
        'user.id',
        'user.email',
        'user.password',
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
    };
  }
}
