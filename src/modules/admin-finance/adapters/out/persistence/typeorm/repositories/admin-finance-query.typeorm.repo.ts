import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import {
  AdminFinanceFilters,
  AdminFinanceListFilters,
  AdminFinanceMovementListOutput,
  AdminFinanceMovementOutput,
  AdminFinanceSummaryOutput,
} from "src/modules/admin-finance/application/dtos/admin-finance.output";
import { AdminFinanceQueryRepository } from "src/modules/admin-finance/domain/ports/admin-finance-query.repository";

const numberFrom = (value: unknown) => Number(value ?? 0);

@Injectable()
export class AdminFinanceQueryTypeormRepository implements AdminFinanceQueryRepository {
  constructor(private readonly dataSource: DataSource) {}

  async getSummary(filters: AdminFinanceFilters): Promise<AdminFinanceSummaryOutput> {
    const params = this.params(filters);
    const [income] = await this.dataSource.query(
      `
      WITH payment_totals AS (
        SELECT sale_order_id, COALESCE(SUM(amount), 0) AS collected
        FROM sale_payments
        GROUP BY sale_order_id
      )
      SELECT
        COALESCE((SELECT SUM(sp.amount) FROM sale_payments sp WHERE ($1::date IS NULL OR sp.date::date >= $1::date) AND ($2::date IS NULL OR sp.date::date <= $2::date)), 0) AS collected,
        COALESCE(SUM(GREATEST(so.total - COALESCE(pt.collected, 0), 0)), 0) AS pending
      FROM sale_orders so
      LEFT JOIN payment_totals pt ON pt.sale_order_id = so.id
      WHERE so.is_active = true
      `,
      [params.from, params.to],
    );
    const [expenses] = await this.dataSource.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN pd.status = 'APPROVED' THEN pd.amount ELSE 0 END), 0) AS paid,
        COALESCE((SELECT SUM(ap.amount_pending) FROM accounts_payable ap WHERE ap.status IN ('PENDING', 'PARTIAL', 'OVERDUE')), 0) AS pending,
        COALESCE((SELECT SUM(ap.amount_pending) FROM accounts_payable ap WHERE ap.amount_pending > 0 AND ap.due_date < CURRENT_DATE), 0) AS overdue,
        COALESCE(SUM(CASE WHEN pd.status = 'SCHEDULED' THEN pd.amount ELSE 0 END), 0) AS scheduled
      FROM payment_documents pd
      WHERE ($1::date IS NULL OR pd.date::date >= $1::date)
        AND ($2::date IS NULL OR pd.date::date <= $2::date)
      `,
      [params.from, params.to],
    );

    const collected = numberFrom(income?.collected);
    const pendingIncome = numberFrom(income?.pending);
    const paid = numberFrom(expenses?.paid);
    const pendingExpense = numberFrom(expenses?.pending);
    return {
      income: { collected, pending: pendingIncome },
      expenses: {
        paid,
        pending: pendingExpense,
        overdue: numberFrom(expenses?.overdue),
        scheduled: numberFrom(expenses?.scheduled),
      },
      net: {
        collectedMinusPaid: collected - paid,
        projectedAfterPending: collected + pendingIncome - paid - pendingExpense,
      },
    };
  }

  async listMovements(filters: AdminFinanceListFilters): Promise<AdminFinanceMovementListOutput> {
    const params = this.params(filters);
    const args = [
      params.from,
      params.to,
      params.type,
      params.status,
      params.q ? `%${params.q}%` : null,
      (filters.page - 1) * filters.limit,
      filters.limit,
    ];
    const rows = await this.dataSource.query(
      `
      WITH movements AS (
        SELECT
          'INCOME' AS type,
          'SALE_ORDER' AS source,
          sp.sale_order_id::text AS source_id,
          sp.amount::numeric AS amount,
          'PEN' AS currency,
          'COLLECTED' AS status,
          sp.date AS date,
          CONCAT('Pedido ', COALESCE(so.serie, ''), CASE WHEN so.correlative IS NULL THEN '' ELSE CONCAT('-', so.correlative::text) END) AS description
        FROM sale_payments sp
        JOIN sale_orders so ON so.id = sp.sale_order_id
        WHERE so.is_active = true
        UNION ALL
        SELECT
          'EXPENSE' AS type,
          CASE WHEN slp.id IS NULL THEN 'PURCHASE' ELSE 'LOGISTICS' END AS source,
          COALESCE(pd.account_payable_id, pd.po_id)::text AS source_id,
          pd.amount::numeric AS amount,
          pd.currency::text AS currency,
          pd.status AS status,
          pd.date AS date,
          COALESCE(ap.description, pd.method, 'Egreso') AS description
        FROM payment_documents pd
        LEFT JOIN accounts_payable ap ON ap.account_payable_id = pd.account_payable_id
        LEFT JOIN sale_order_logistics_payables slp ON slp.account_payable_id = pd.account_payable_id
      )
      SELECT *, COUNT(*) OVER() AS total_count
      FROM movements
      WHERE ($1::date IS NULL OR date::date >= $1::date)
        AND ($2::date IS NULL OR date::date <= $2::date)
        AND ($3::text IS NULL OR type = $3::text)
        AND ($4::text IS NULL OR status = $4::text)
        AND ($5::text IS NULL OR description ILIKE $5::text OR source_id ILIKE $5::text)
      ORDER BY date DESC
      OFFSET $6
      LIMIT $7
      `,
      args,
    );

    return {
      items: rows.map(this.mapMovement),
      total: numberFrom(rows[0]?.total_count),
    };
  }

  private params(filters: AdminFinanceFilters) {
    return {
      from: filters.from ?? null,
      to: filters.to ?? null,
      type: filters.type ?? null,
      status: filters.status ?? null,
      q: filters.q ?? null,
    };
  }

  private mapMovement(row: any): AdminFinanceMovementOutput {
    return {
      type: row.type,
      source: row.source,
      sourceId: row.source_id,
      amount: numberFrom(row.amount),
      currency: row.currency,
      status: row.status,
      date: row.date instanceof Date ? row.date.toISOString() : String(row.date),
      description: row.description,
    };
  }
}
