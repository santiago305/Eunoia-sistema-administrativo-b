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
        SELECT sale_order_id, COALESCE(SUM(amount) FILTER (WHERE status = 'POSTED'), 0) AS collected
        FROM sale_payments
        GROUP BY sale_order_id
      )
      SELECT
        COALESCE((SELECT SUM(sp.amount) FROM sale_payments sp JOIN sale_orders so_payment ON so_payment.id = sp.sale_order_id WHERE so_payment.is_active = true AND sp.status = 'POSTED' AND ($1::date IS NULL OR sp.date::date >= $1::date) AND ($2::date IS NULL OR sp.date::date <= $2::date)), 0) AS collected,
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
        COALESCE(SUM(CASE WHEN pd.status IN ('POSTED', 'APPROVED') THEN pd.amount ELSE 0 END), 0) AS paid,
        COALESCE((SELECT SUM(ap.amount_pending) FROM accounts_payable ap WHERE ap.status IN ('PENDING', 'PARTIAL', 'OVERDUE')), 0) AS pending,
        COALESCE((SELECT SUM(ap.amount_pending) FROM accounts_payable ap WHERE ap.amount_pending > 0 AND ap.due_date < CURRENT_DATE), 0) AS overdue,
        COALESCE(SUM(CASE WHEN pd.status = 'SCHEDULED' THEN pd.amount ELSE 0 END), 0) AS scheduled
      FROM payment_documents pd
      WHERE ($1::date IS NULL OR pd.date::date >= $1::date)
        AND ($2::date IS NULL OR pd.date::date <= $2::date)
      `,
      [params.from, params.to],
    );

    const incomeByCurrency = await this.dataSource.query(
      `
      WITH posted AS (
        SELECT sp.sale_order_id, sp.currency, COALESCE(SUM(sp.amount), 0) AS collected
        FROM sale_payments sp
        INNER JOIN sale_orders so ON so.id = sp.sale_order_id
        WHERE so.is_active = true AND sp.status = 'POSTED'
          AND ($1::date IS NULL OR sp.date::date >= $1::date)
          AND ($2::date IS NULL OR sp.date::date <= $2::date)
        GROUP BY sp.sale_order_id, sp.currency
      )
      SELECT currency::text AS currency,
             COALESCE(SUM(collected), 0) AS collected,
             0::numeric AS pending
      FROM posted
      GROUP BY currency
      `,
      [params.from, params.to],
    );

    const expensesByCurrency = await this.dataSource.query(
      `
      SELECT pd.currency::text AS currency,
             COALESCE(SUM(pd.amount) FILTER (WHERE pd.status IN ('POSTED', 'APPROVED')), 0) AS paid,
             0::numeric AS pending,
             0::numeric AS overdue,
             COALESCE(SUM(pd.amount) FILTER (WHERE pd.status = 'SCHEDULED'), 0) AS scheduled,
             COALESCE(SUM(pd.amount) FILTER (WHERE pd.status = 'VOIDED'), 0) AS voided
      FROM payment_documents pd
      WHERE ($1::date IS NULL OR pd.date::date >= $1::date)
        AND ($2::date IS NULL OR pd.date::date <= $2::date)
      GROUP BY pd.currency
      `,
      [params.from, params.to],
    );

    const payableByCurrency = await this.dataSource.query(`
      SELECT ap.currency::text AS currency,
             COALESCE(SUM(ap.amount_pending) FILTER (WHERE ap.status IN ('PENDING', 'PARTIAL', 'OVERDUE')), 0) AS pending,
             COALESCE(SUM(ap.amount_pending) FILTER (WHERE ap.status IN ('OVERDUE') OR ap.due_date < CURRENT_DATE), 0) AS overdue
      FROM accounts_payable ap
      GROUP BY ap.currency
    `);

    const collected = numberFrom(income?.collected);
    const pendingIncome = numberFrom(income?.pending);
    const paid = numberFrom(expenses?.paid);
    const pendingExpense = numberFrom(expenses?.pending);
    const incomeMap = Object.fromEntries((incomeByCurrency ?? []).filter((row: any) => row.currency).map((row: any) => [
      row.currency,
      { collected: numberFrom(row.collected), pending: numberFrom(row.pending) },
    ]));
    if (pendingIncome > 0) {
      incomeMap.PEN = { ...(incomeMap.PEN ?? { collected: 0, pending: 0 }), pending: pendingIncome };
    }
    const expenseMap = Object.fromEntries((expensesByCurrency ?? []).filter((row: any) => row.currency).map((row: any) => [
      row.currency,
      {
        paid: numberFrom(row.paid),
        pending: numberFrom(row.pending),
        overdue: numberFrom(row.overdue),
        scheduled: numberFrom(row.scheduled),
        voided: numberFrom(row.voided),
      },
    ]));
    for (const row of payableByCurrency ?? []) {
      if (!row.currency) continue;
      expenseMap[row.currency] = {
        ...(expenseMap[row.currency] ?? { paid: 0, pending: 0, overdue: 0, scheduled: 0, voided: 0 }),
        pending: numberFrom(row.pending),
        overdue: numberFrom(row.overdue),
      };
    }
    const currencies = new Set([...Object.keys(incomeMap), ...Object.keys(expenseMap)]);
    const netMap = Object.fromEntries([...currencies].map((currency) => {
      const incomeCurrency = incomeMap[currency] ?? { collected: 0, pending: 0 };
      const expenseCurrency = expenseMap[currency] ?? { paid: 0, pending: 0 };
      return [currency, {
        collectedMinusPaid: incomeCurrency.collected - expenseCurrency.paid,
        projectedAfterPending: incomeCurrency.collected + incomeCurrency.pending - expenseCurrency.paid - expenseCurrency.pending,
      }];
    }));
    return {
      income: { collected, pending: pendingIncome, byCurrency: incomeMap },
      expenses: {
        paid,
        pending: pendingExpense,
        overdue: numberFrom(expenses?.overdue),
        scheduled: numberFrom(expenses?.scheduled),
        byCurrency: expenseMap,
      },
      net: {
        collectedMinusPaid: collected - paid,
        projectedAfterPending: collected + pendingIncome - paid - pendingExpense,
        byCurrency: netMap,
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
          sp.currency::text AS currency,
          sp.status AS status,
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
