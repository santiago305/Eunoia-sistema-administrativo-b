import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { AdviserEntity } from '../../adapters/out/persistence/typeorm/entities/adviser.entity';
import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from 'src/shared/listing-search/domain/listing-search.repository';
import { AdviserSearchFields, AdviserSearchRule, sanitizeAdviserSearchSnapshot } from '../support/adviser-search';
import { adviserOrderPeriodSql, resolveAdviserPeriod } from '../support/adviser-period';

@Injectable()
export class ListAdviserSummaryUsecase {
  constructor(
    @InjectRepository(AdviserEntity) private readonly advisers: Repository<AdviserEntity>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @Inject(LISTING_SEARCH_STORAGE) private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: { page?: number; limit?: number; q?: string; filters?: string | AdviserSearchRule[]; requestedBy?: string; startDate?: string; endDate?: string }) {
    const page = Math.max(1, Number(input.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(input.limit ?? 25)));
    let parsedFilters: AdviserSearchRule[] = [];
    try { parsedFilters = Array.isArray(input.filters) ? input.filters : input.filters ? JSON.parse(input.filters) : []; } catch { parsedFilters = []; }
    const snapshot = sanitizeAdviserSearchSnapshot({ q: input.q, filters: parsedFilters });
    const period = resolveAdviserPeriod(input.startDate, input.endDate);
    const periodParams = { periodStart: period.startDate, periodEnd: period.endDate };
    const query = snapshot.q ?? '';
    const builder = this.advisers
      .createQueryBuilder('a')
      .innerJoin(User, 'u', 'u.user_id = a.user_id AND u.deleted = false')
      .leftJoin('sale_orders', 'o', `o.assigned_by = a.user_id AND o.is_active = true AND ${adviserOrderPeriodSql('o')}`, periodParams)
      .where('1 = 1');
    if (query) builder.andWhere('(u.name ILIKE :q OR u.email ILIKE :q)', { q: `%${query}%` });
    snapshot.filters.forEach((rule, index) => {
      const key = `filter${index}`;
      if (rule.field === AdviserSearchFields.NAME || rule.field === AdviserSearchFields.EMAIL) {
        const column = rule.field === AdviserSearchFields.NAME ? 'u.name' : 'u.email';
        builder.andWhere(rule.operator === 'eq' ? `LOWER(${column}) = LOWER(:${key})` : `${column} ILIKE :${key}`, { [key]: rule.operator === 'eq' ? rule.value : `%${rule.value}%` });
      }
      if (rule.field === AdviserSearchFields.IS_ACTIVE) {
        const values = (rule.values ?? []).map((value) => value === 'true');
        builder.andWhere(`a.is_active ${rule.mode === 'exclude' ? 'NOT IN' : 'IN'} (:...${key})`, { [key]: values });
      }
    });
    builder.select('a.user_id', 'id')
      .addSelect('u.name', 'name')
      .addSelect('u.email', 'email')
      .addSelect('a.is_active', 'isActive')
      .addSelect('COUNT(DISTINCT o.id)', 'assignedOrders')
      .addSelect('COALESCE(SUM(o.total), 0)', 'soldTotal')
      .addSelect(`(SELECT COALESCE(SUM(sp.amount), 0) FROM sale_payments sp INNER JOIN sale_orders so2 ON so2.id = sp.sale_order_id AND so2.assigned_by = a.user_id AND so2.is_active = true AND ${adviserOrderPeriodSql('so2')})`, 'collectedTotal')
      .groupBy('a.user_id').addGroupBy('u.name').addGroupBy('u.email').addGroupBy('a.is_active')
      .orderBy('u.name', 'ASC');
    const numericExpressions: Record<string, string> = { assignedOrders: 'COUNT(DISTINCT o.id)', soldTotal: 'COALESCE(SUM(o.total), 0)', collectedTotal: `(SELECT COALESCE(SUM(sp.amount), 0) FROM sale_payments sp INNER JOIN sale_orders so2 ON so2.id = sp.sale_order_id AND so2.assigned_by = a.user_id AND so2.is_active = true AND ${adviserOrderPeriodSql('so2')})` };
    snapshot.filters.forEach((rule, index) => {
      const expression = numericExpressions[rule.field]; if (!expression) return;
      const operator = ({ eq: '=', gt: '>', gte: '>=', lt: '<', lte: '<=' } as Record<string, string>)[rule.operator];
      if (operator) builder.andHaving(`${expression} ${operator} :numeric${index}`, { [`numeric${index}`]: Number(rule.value) });
    });
    const allItems = await builder.getRawMany();
    const total = allItems.length;
    const items = allItems.slice((page - 1) * limit, page * limit);
    if (input.requestedBy && (snapshot.q || snapshot.filters.length)) await this.searchStorage.touchRecentSearch({ userId: input.requestedBy, tableKey: 'advisers', snapshot });
    return {
      items: items.map((row) => ({ ...row, isActive: row.isActive === true || row.isactive === true, assignedOrders: Number(row.assignedOrders ?? 0), soldTotal: Number(row.soldTotal ?? 0), collectedTotal: Number(row.collectedTotal ?? 0) })),
      total, page, limit,
      totalPages: Math.max(1, Math.ceil(total / limit)), period,
    };
  }
}
