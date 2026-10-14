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

  async execute(input: {
    page?: number;
    limit?: number;
    q?: string;
    filters?: string | AdviserSearchRule[];
    requestedBy?: string;
    startDate?: string;
    endDate?: string;
    includeOrderSummary?: boolean;
    includePerformanceSummary?: boolean;
  }) {
    const page = Math.max(1, Number(input.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(input.limit ?? 25)));
    let parsedFilters: AdviserSearchRule[] = [];
    try { parsedFilters = Array.isArray(input.filters) ? input.filters : input.filters ? JSON.parse(input.filters) : []; } catch { parsedFilters = []; }
    const sanitizedSnapshot = sanitizeAdviserSearchSnapshot({ q: input.q, filters: parsedFilters });
    const snapshot = {
      ...sanitizedSnapshot,
      filters: sanitizedSnapshot.filters.filter((rule) => {
        if (rule.field === AdviserSearchFields.ASSIGNED_ORDERS) {
          return input.includeOrderSummary || input.includePerformanceSummary;
        }
        if (
          rule.field === AdviserSearchFields.SOLD_TOTAL ||
          rule.field === AdviserSearchFields.COLLECTED_TOTAL
        ) {
          return input.includePerformanceSummary;
        }
        return true;
      }),
    };
    const period = resolveAdviserPeriod(input.startDate, input.endDate);
    const periodParams = { periodStart: period.startDate, periodEnd: period.endDate };
    const query = snapshot.q ?? '';
    const currencyMetricsSql = `(
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'currency', currency_totals.currency,
        'soldTotal', currency_totals.sold_total,
        'collectedTotal', currency_totals.collected_total
      ) ORDER BY currency_totals.currency), '[]'::jsonb)
      FROM (
        SELECT currencies.currency,
          COALESCE((SELECT SUM(so.total)
            FROM sale_orders so
            WHERE so.assigned_by = a.user_id AND so.is_active = true
              AND so.currency = currencies.currency AND ${adviserOrderPeriodSql('so')}), 0) AS sold_total,
          COALESCE((SELECT SUM(sp.amount)
            FROM sale_payments sp
            INNER JOIN sale_orders paid_order ON paid_order.id = sp.sale_order_id
            WHERE sp.status = 'POSTED' AND sp.currency = currencies.currency
              AND paid_order.assigned_by = a.user_id AND paid_order.is_active = true
              AND ${adviserOrderPeriodSql('paid_order')}), 0) AS collected_total
        FROM (
          SELECT so2.currency FROM sale_orders so2
          WHERE so2.assigned_by = a.user_id AND so2.is_active = true AND ${adviserOrderPeriodSql('so2')}
          UNION
          SELECT sp2.currency FROM sale_payments sp2
          INNER JOIN sale_orders paid_order2 ON paid_order2.id = sp2.sale_order_id
          WHERE sp2.status = 'POSTED' AND paid_order2.assigned_by = a.user_id
            AND paid_order2.is_active = true AND ${adviserOrderPeriodSql('paid_order2')}
        ) currencies
      ) currency_totals
    )`;
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
      .addSelect(currencyMetricsSql, 'currencyMetrics')
      .groupBy('a.user_id').addGroupBy('u.name').addGroupBy('u.email').addGroupBy('a.is_active')
      .orderBy('u.name', 'ASC');
    const numericExpressions: Record<string, string> = {
      assignedOrders: 'COUNT(DISTINCT o.id)',
      // Monetary search has no currency selector; match if any one currency reaches the threshold.
      soldTotal: `(SELECT COALESCE(MAX(currency_total.total), 0) FROM (SELECT SUM(so2.total) AS total FROM sale_orders so2 WHERE so2.assigned_by = a.user_id AND so2.is_active = true AND ${adviserOrderPeriodSql('so2')} GROUP BY so2.currency) currency_total)`,
      collectedTotal: `(SELECT COALESCE(MAX(currency_total.total), 0) FROM (SELECT SUM(sp.amount) AS total FROM sale_payments sp INNER JOIN sale_orders so2 ON so2.id = sp.sale_order_id WHERE sp.status = 'POSTED' AND so2.assigned_by = a.user_id AND so2.is_active = true AND ${adviserOrderPeriodSql('so2')} GROUP BY sp.currency) currency_total)`,
    };
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
      items: items.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        isActive: row.isActive === true || row.isactive === true,
        ...(input.includeOrderSummary || input.includePerformanceSummary
          ? { assignedOrders: Number(row.assignedOrders ?? 0) }
          : {}),
        ...(input.includePerformanceSummary
          ? (() => {
              const rawMetrics = row.currencyMetrics ?? row.currencymetrics ?? [];
              const currencyMetrics = (typeof rawMetrics === 'string' ? JSON.parse(rawMetrics) : rawMetrics) as Array<{ currency: string; soldTotal: string | number; collectedTotal: string | number }>;
              const normalizedMetrics = currencyMetrics.map((metric) => ({ ...metric, soldTotal: Number(metric.soldTotal ?? 0), collectedTotal: Number(metric.collectedTotal ?? 0) }));
              const singleCurrency = normalizedMetrics.length === 1 ? normalizedMetrics[0] : null;
              return {
                currencyMetrics: normalizedMetrics,
                soldTotal: singleCurrency?.soldTotal ?? (normalizedMetrics.length ? null : 0),
                collectedTotal: singleCurrency?.collectedTotal ?? (normalizedMetrics.length ? null : 0),
              };
            })()
          : {}),
      })),
      total, page, limit,
      totalPages: Math.max(1, Math.ceil(total / limit)), period,
    };
  }
}
