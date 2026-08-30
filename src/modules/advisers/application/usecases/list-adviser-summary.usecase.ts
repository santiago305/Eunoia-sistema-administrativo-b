import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { AdviserEntity } from '../../adapters/out/persistence/typeorm/entities/adviser.entity';

@Injectable()
export class ListAdviserSummaryUsecase {
  constructor(
    @InjectRepository(AdviserEntity) private readonly advisers: Repository<AdviserEntity>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async execute(input: { page?: number; limit?: number; q?: string }) {
    const page = Math.max(1, Number(input.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(input.limit ?? 25)));
    const query = String(input.q ?? '').trim();
    const builder = this.advisers
      .createQueryBuilder('a')
      .innerJoin(User, 'u', 'u.user_id = a.user_id AND u.deleted = false')
      .leftJoin('sale_orders', 'o', 'o.assigned_by = a.user_id AND o.is_active = true')
      .where('1 = 1');
    if (query) builder.andWhere('(u.name ILIKE :q OR u.email ILIKE :q)', { q: `%${query}%` });
    builder.select('a.user_id', 'id')
      .addSelect('u.name', 'name')
      .addSelect('u.email', 'email')
      .addSelect('a.is_active', 'isActive')
      .addSelect('COUNT(DISTINCT o.id)', 'assignedOrders')
      .addSelect('COALESCE(SUM(o.total), 0)', 'soldTotal')
      .addSelect('(SELECT COALESCE(SUM(sp.amount), 0) FROM sale_payments sp INNER JOIN sale_orders so2 ON so2.id = sp.sale_order_id AND so2.assigned_by = a.user_id AND so2.is_active = true)', 'collectedTotal')
      .groupBy('a.user_id').addGroupBy('u.name').addGroupBy('u.email').addGroupBy('a.is_active')
      .orderBy('u.name', 'ASC');
    const total = await builder.clone().select('COUNT(*)', 'count').getRawOne<{ count: string }>();
    const items = await builder.offset((page - 1) * limit).limit(limit).getRawMany();
    return {
      items: items.map((row) => ({ ...row, isActive: row.isActive === true || row.isactive === true, assignedOrders: Number(row.assignedOrders ?? 0), soldTotal: Number(row.soldTotal ?? 0), collectedTotal: Number(row.collectedTotal ?? 0) })),
      total: Number(total?.count ?? 0), page, limit,
      totalPages: Math.max(1, Math.ceil(Number(total?.count ?? 0) / limit)),
    };
  }
}
