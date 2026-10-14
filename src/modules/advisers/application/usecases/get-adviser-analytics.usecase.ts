import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaleOrderEntity } from 'src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity';
import { AdviserEntity } from '../../adapters/out/persistence/typeorm/entities/adviser.entity';
import {
  buildAdviserAnalyticsPeriod,
  buildAdviserMonthlyAnalytics,
  getAdviserPerformanceTrend,
  resolveAdviserAnalyticsMonths,
} from '../support/adviser-analytics';

type AnalyticsRow = {
  monthKey: string;
  currency: string;
  orders: string | number;
  soldTotal: string | number;
  collectedTotal: string | number;
};

@Injectable()
export class GetAdviserAnalyticsUsecase {
  constructor(
    @InjectRepository(SaleOrderEntity)
    private readonly saleOrders: Repository<SaleOrderEntity>,
    @InjectRepository(AdviserEntity)
    private readonly advisers: Repository<AdviserEntity>,
  ) {}

  async execute(input: { adviserUserId: string; months?: number | string }) {
    const adviser = await this.advisers.findOne({
      where: { userId: input.adviserUserId },
    });
    if (!adviser) throw new NotFoundException('Asesor no encontrado');

    const months = resolveAdviserAnalyticsMonths(input.months);
    const period = buildAdviserAnalyticsPeriod(months);
    const rows = (await this.saleOrders.query(
      `
        WITH sold AS (
          SELECT TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') AS "monthKey",
            o.currency, COUNT(DISTINCT o.id)::int AS orders, SUM(o.total) AS "soldTotal"
          FROM sale_orders o
          WHERE o.assigned_by = $1 AND o.is_active = true
            AND o.created_at >= $2::date
            AND o.created_at < ($3::date + INTERVAL '1 day')
          GROUP BY DATE_TRUNC('month', o.created_at), o.currency
        ), collected AS (
          SELECT TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') AS "monthKey",
            sp.currency, SUM(sp.amount) AS "collectedTotal"
          FROM sale_orders o
          INNER JOIN sale_payments sp ON sp.sale_order_id = o.id AND sp.status = 'POSTED'
          WHERE o.assigned_by = $1 AND o.is_active = true
            AND o.created_at >= $2::date
            AND o.created_at < ($3::date + INTERVAL '1 day')
          GROUP BY DATE_TRUNC('month', o.created_at), sp.currency
        )
        SELECT COALESCE(sold."monthKey", collected."monthKey") AS "monthKey",
          COALESCE(sold.currency, collected.currency) AS currency,
          COALESCE(sold.orders, 0)::int AS orders,
          COALESCE(sold."soldTotal", 0) AS "soldTotal",
          COALESCE(collected."collectedTotal", 0) AS "collectedTotal"
        FROM sold
        FULL OUTER JOIN collected USING ("monthKey", currency)
        ORDER BY "monthKey" ASC, currency ASC
      `,
      [input.adviserUserId, period.startDate, period.endDate],
    )) as AnalyticsRow[];
    const items = buildAdviserMonthlyAnalytics(
      period.monthKeys,
      rows.map((row) => ({
        monthKey: row.monthKey,
        currency: row.currency,
        orders: Number(row.orders ?? 0),
        soldTotal: Number(row.soldTotal ?? 0),
        collectedTotal: Number(row.collectedTotal ?? 0),
      })),
    );

    const currencies = [...new Set(items.map((item) => item.currency))].sort();
    const trends = Object.fromEntries(currencies.map((currency) => [
      currency,
      getAdviserPerformanceTrend(items.filter((item) => item.currency === currency)),
    ]));

    return {
      months,
      period: { startDate: period.startDate, endDate: period.endDate },
      currencies,
      items,
      trends,
    };
  }
}
