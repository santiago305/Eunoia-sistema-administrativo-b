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
        SELECT
          TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') AS "monthKey",
          COUNT(DISTINCT o.id)::int AS "orders",
          COALESCE(SUM(o.total), 0) AS "soldTotal",
          COALESCE(SUM(COALESCE(payments.collected, 0)), 0) AS "collectedTotal"
        FROM sale_orders o
        LEFT JOIN (
          SELECT sale_order_id, SUM(amount) AS collected
          FROM sale_payments
          GROUP BY sale_order_id
        ) payments ON payments.sale_order_id = o.id
        WHERE o.assigned_by = $1
          AND o.is_active = true
          AND o.created_at >= $2::date
          AND o.created_at < ($3::date + INTERVAL '1 day')
        GROUP BY DATE_TRUNC('month', o.created_at)
        ORDER BY DATE_TRUNC('month', o.created_at) ASC
      `,
      [input.adviserUserId, period.startDate, period.endDate],
    )) as AnalyticsRow[];
    const items = buildAdviserMonthlyAnalytics(
      period.monthKeys,
      rows.map((row) => ({
        monthKey: row.monthKey,
        orders: Number(row.orders ?? 0),
        soldTotal: Number(row.soldTotal ?? 0),
        collectedTotal: Number(row.collectedTotal ?? 0),
      })),
    );

    return {
      months,
      period: { startDate: period.startDate, endDate: period.endDate },
      items,
      trend: getAdviserPerformanceTrend(items),
    };
  }
}
