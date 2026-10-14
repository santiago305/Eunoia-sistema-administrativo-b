import "dotenv/config";
import type { DataSource } from "typeorm";

export type ReconciliationQuery = { section: string; sql: string };
export type ReconciliationQuerySource = { query: (sql: string) => Promise<any[]> };

/** Aggregated, read-only snapshots used to compare the legacy baseline with the new financial ledger. */
export const salePaymentReconciliationQueries: ReconciliationQuery[] = [
  {
    section: "paymentsByOrderDateAccountCurrencyAndStatus",
    sql: `
      SELECT sale_order_id, payment_date::text AS payment_date, accounting_date::text AS accounting_date,
             company_payment_account_id, currency::text AS currency, status,
             COUNT(*)::int AS payment_count, SUM(amount)::numeric(14,2)::text AS recorded_amount
      FROM sale_payments
      GROUP BY sale_order_id, payment_date, accounting_date, company_payment_account_id, currency, status
      ORDER BY sale_order_id, payment_date, accounting_date, company_payment_account_id, currency, status
    `,
  },
  {
    section: "applicationsByTargetOrderAndPaymentDimensions",
    sql: `
      SELECT spa.sale_order_id AS allocated_sale_order_id, sp.sale_order_id AS source_sale_order_id,
             sp.payment_date::text AS payment_date, sp.accounting_date::text AS accounting_date,
             sp.company_payment_account_id, spa.currency::text AS currency, sp.status,
             COUNT(*)::int AS allocation_count, SUM(spa.amount)::numeric(14,2)::text AS applied_amount
      FROM sale_payment_allocations spa
      INNER JOIN sale_payments sp ON sp.id = spa.sale_payment_id
      GROUP BY spa.sale_order_id, sp.sale_order_id, sp.payment_date, sp.accounting_date,
               sp.company_payment_account_id, spa.currency, sp.status
      ORDER BY spa.sale_order_id, sp.payment_date, sp.company_payment_account_id, spa.currency, sp.status
    `,
  },
  {
    section: "accountMovementsByDateAccountCurrencyAndType",
    sql: `
      SELECT operation_date::text AS operation_date, company_payment_account_id,
             currency::text AS currency, movement_type, COUNT(*)::int AS movement_count,
             COUNT(DISTINCT sale_payment_id)::int AS income_count,
             SUM(amount)::numeric(14,2)::text AS net_amount
      FROM financial_account_movements
      GROUP BY operation_date, company_payment_account_id, currency, movement_type
      ORDER BY operation_date, company_payment_account_id, currency, movement_type
    `,
  },
  {
    section: "customerCreditMovementsByOrderCurrencyAndType",
    sql: `
      SELECT source_sale_order_id, target_sale_order_id, currency::text AS currency,
             movement_type, (created_at AT TIME ZONE 'UTC')::date::text AS created_date,
             COUNT(*)::int AS movement_count, SUM(amount)::numeric(14,2)::text AS net_amount
      FROM customer_credit_movements
      GROUP BY source_sale_order_id, target_sale_order_id, currency, movement_type,
               (created_at AT TIME ZONE 'UTC')::date
      ORDER BY source_sale_order_id, target_sale_order_id, created_date, currency, movement_type
    `,
  },
  {
    section: "bankStatementLinesByDateAccountAndCurrency",
    sql: `
      SELECT line.operation_date::text AS operation_date, line.company_payment_account_id,
             line.currency::text AS currency, COUNT(*)::int AS line_count,
             SUM(line.amount)::numeric(14,2)::text AS statement_amount,
             SUM(COALESCE(active.reconciled_amount, 0))::numeric(14,2)::text AS reconciled_amount,
             SUM(line.amount - COALESCE(active.reconciled_amount, 0))::numeric(14,2)::text AS available_amount
      FROM bank_statement_lines line
      LEFT JOIN LATERAL (
        SELECT SUM(allocation.amount) AS reconciled_amount
        FROM bank_reconciliation_allocations allocation
        WHERE allocation.bank_statement_line_id = line.id AND allocation.unreconciled_at IS NULL
      ) active ON true
      GROUP BY line.operation_date, line.company_payment_account_id, line.currency
      ORDER BY line.operation_date, line.company_payment_account_id, line.currency
    `,
  },
];

export async function collectSalePaymentReconciliation(source: ReconciliationQuerySource) {
  const sections: Record<string, any[]> = {};
  for (const query of salePaymentReconciliationQueries) {
    sections[query.section] = await source.query(query.sql);
  }
  return sections;
}

export async function createSalePaymentReconciliationReport(dataSource: Pick<DataSource, "createQueryRunner">) {
  const runner = dataSource.createQueryRunner();
  let connected = false;
  let transactionStarted = false;
  try {
    await runner.connect();
    connected = true;
    await runner.startTransaction("REPEATABLE READ");
    transactionStarted = true;
    await runner.query("SET TRANSACTION READ ONLY");
    const [{ transaction_read_only: readOnly }] = await runner.query("SHOW transaction_read_only");
    if (readOnly !== "on") throw new Error("La transacción de conciliación no está en modo de solo lectura.");

    const sections = await collectSalePaymentReconciliation(runner);
    await runner.commitTransaction();
    transactionStarted = false;
    return { generatedAt: new Date().toISOString(), readOnly: true as const, sections };
  } catch (error) {
    if (transactionStarted && runner.isTransactionActive) await runner.rollbackTransaction();
    throw error;
  } finally {
    if (connected) await runner.release();
  }
}

export async function runSalePaymentReconciliation(summary = false) {
  const { migrationDataSource } = await import("../src/infrastructure/database/typeorm.config");
  await migrationDataSource.initialize();
  try {
    const snapshot = await createSalePaymentReconciliationReport(migrationDataSource);
    const report = {
      ...(summary
        ? { generatedAt: snapshot.generatedAt, readOnly: snapshot.readOnly, rowCounts: Object.fromEntries(Object.entries(snapshot.sections).map(([section, rows]) => [section, rows.length])) }
        : snapshot),
    };
    console.log(JSON.stringify(report, null, 2));
    return report;
  } finally {
    await migrationDataSource.destroy();
  }
}

if (require.main === module) {
  runSalePaymentReconciliation(process.argv.includes("--summary")).catch((error) => {
    console.error("No se pudo generar el reporte de conciliación de ingresos:", error);
    process.exit(1);
  });
}
