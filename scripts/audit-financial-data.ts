import "dotenv/config";
import { migrationDataSource } from "../src/infrastructure/database/typeorm.config";

export type FinancialAuditCheck = {
  check: string;
  total: number;
  details?: unknown[];
};

const queries: Array<{ check: string; sql: string }> = [
  {
    check: "legacy_bank_accounts_table_remaining",
    sql: `
      SELECT to_regclass('public.bank_accounts') AS id
      WHERE to_regclass('public.bank_accounts') IS NOT NULL
    `,
  },
  {
    check: "payment_method_legacy_names",
    sql: `
      SELECT method_id AS id, name, code, is_active, is_system, COUNT(*) OVER ()::int AS total
      FROM payment_methods
      WHERE UPPER(BTRIM(name)) IN ('BCP', 'BBVA', 'YAPE', 'PLIN')
      ORDER BY name
    `,
  },
  {
    check: "company_methods_without_method",
    sql: `
      SELECT cm.company_method_id AS id
      FROM company_methods cm
      LEFT JOIN payment_methods pm ON pm.method_id = cm.method_id
      WHERE pm.method_id IS NULL
    `,
  },
  {
    check: "legacy_company_method_number_column",
    sql: `
      SELECT column_name AS id
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'company_methods'
        AND column_name = 'number'
    `,
  },
  {
    check: "legacy_company_method_requires_voucher_column",
    sql: `
      SELECT column_name AS id
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'company_methods'
        AND column_name = 'requires_voucher'
    `,
  },
  {
    check: "supplier_methods_without_method",
    sql: `
      SELECT sm.supplier_method_id AS id
      FROM supplier_methods sm
      LEFT JOIN payment_methods pm ON pm.method_id = sm.method_id
      WHERE pm.method_id IS NULL
    `,
  },
  {
    check: "legacy_supplier_methods_remaining",
    sql: `
      SELECT supplier_method_id AS id, supplier_id, method_id
      FROM supplier_methods
      ORDER BY supplier_id, method_id
    `,
  },
  {
    check: "payment_documents_without_purchase",
    sql: `
      SELECT pd.pay_doc_id AS id, pd.po_id
      FROM payment_documents pd
      LEFT JOIN purchase_orders po ON po.po_id = pd.po_id
      WHERE pd.po_id IS NOT NULL AND po.po_id IS NULL
    `,
  },
  {
    check: "payment_documents_invalid_amount",
    sql: `
      SELECT pay_doc_id AS id, amount
      FROM payment_documents
      WHERE amount <= 0
    `,
  },
  {
    check: "posted_payments_without_method",
    sql: `
      SELECT pay_doc_id AS id, po_id, method, payment_method_id
      FROM payment_documents
      WHERE status IN ('POSTED', 'APPROVED')
        AND payment_method_id IS NULL
    `,
  },
  {
    check: "posted_payments_without_source_account",
    sql: `
      SELECT pay_doc_id AS id, po_id, company_payment_account_id
      FROM payment_documents
      WHERE status IN ('POSTED', 'APPROVED')
        AND company_payment_account_id IS NULL
    `,
  },
  {
    check: "posted_payments_without_required_destination",
    sql: `
      SELECT pd.pay_doc_id AS id, pd.po_id, pd.payment_method_id
      FROM payment_documents pd
      INNER JOIN payment_methods pm ON pm.method_id = pd.payment_method_id
      WHERE pd.status IN ('POSTED', 'APPROVED')
        AND pm.requires_destination = true
        AND pd.supplier_payment_destination_id IS NULL
    `,
  },
  {
    check: "posted_payments_currency_mismatch",
    sql: `
      SELECT pd.pay_doc_id AS id, pd.currency AS payment_currency,
             ap.currency AS payable_currency, cpa.currency AS account_currency
      FROM payment_documents pd
      LEFT JOIN accounts_payable ap
        ON ap.account_payable_id = pd.account_payable_id
      LEFT JOIN company_payment_accounts cpa
        ON cpa.company_payment_account_id = pd.company_payment_account_id
      WHERE pd.status IN ('POSTED', 'APPROVED')
        AND ((ap.account_payable_id IS NOT NULL AND ap.currency::text <> pd.currency::text)
          OR (cpa.company_payment_account_id IS NOT NULL AND cpa.currency::text <> pd.currency::text))
    `,
  },
  {
    check: "overdue_scheduled_payments",
    sql: `
      SELECT pay_doc_id AS id, po_id, scheduled_at
      FROM payment_documents
      WHERE status = 'SCHEDULED'
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= NOW()
    `,
  },
  {
    check: "posted_payments_invalid_allocation_total",
    sql: `
      SELECT pd.pay_doc_id AS id, pd.amount,
             COALESCE(SUM(pa.amount), 0) AS allocated
      FROM payment_documents pd
      LEFT JOIN payment_allocations pa ON pa.payment_id = pd.pay_doc_id
      WHERE pd.status IN ('POSTED', 'APPROVED')
      GROUP BY pd.pay_doc_id, pd.amount
      HAVING ROUND(COALESCE(SUM(pa.amount), 0), 2) <> ROUND(pd.amount, 2)
    `,
  },
  {
    check: "account_payables_without_purchase",
    sql: `
      SELECT ap.account_payable_id AS id, ap.purchase_id
      FROM accounts_payable ap
      LEFT JOIN purchase_orders po ON po.po_id = ap.purchase_id
      WHERE po.po_id IS NULL
    `,
  },
  {
    check: "credit_quotas_without_account_payable",
    sql: `
      SELECT cq.quota_id AS id, cq.po_id, cq.total_to_pay
      FROM credit_quotas cq
      LEFT JOIN accounts_payable ap ON ap.quota_id = cq.quota_id
      WHERE cq.po_id IS NOT NULL
        AND cq.total_to_pay > 0
        AND ap.account_payable_id IS NULL
    `,
  },
  {
    check: "cancelled_purchases_with_open_payables",
    sql: `
      SELECT po.po_id AS purchase_id, ap.account_payable_id AS id,
             ap.status, ap.amount_pending
      FROM purchase_orders po
      INNER JOIN accounts_payable ap ON ap.purchase_id = po.po_id
      WHERE po.status = 'CANCELLED'
        AND ap.status NOT IN ('PAID', 'CANCELLED')
    `,
  },
  {
    check: "account_payables_inconsistent_balance",
    sql: `
      SELECT account_payable_id AS id, amount_total, amount_paid, amount_pending
      FROM accounts_payable
      WHERE amount_paid < 0
         OR amount_pending < 0
         OR amount_paid > amount_total
         OR amount_pending > amount_total
         OR ROUND(amount_paid + amount_pending, 2) <> ROUND(amount_total, 2)
    `,
  },
  {
    check: "account_payables_manual_review",
    sql: `
      SELECT account_payable_id AS id, purchase_id, quota_id, reconciliation_note
      FROM accounts_payable
      WHERE requires_manual_review = true
    `,
  },
  {
    check: "duplicate_company_method_relations",
    sql: `
      SELECT company_id, method_id, COUNT(*)::int AS total
      FROM company_methods
      GROUP BY company_id, method_id
      HAVING COUNT(*) > 1
    `,
  },
  {
    check: "duplicate_supplier_method_relations",
    sql: `
      SELECT supplier_id, method_id, COALESCE(BTRIM(number), '') AS relation_number, COUNT(*)::int AS total
      FROM supplier_methods
      GROUP BY supplier_id, method_id, COALESCE(BTRIM(number), '')
      HAVING COUNT(*) > 1
    `,
  },
  {
    check: "duplicate_default_company_payment_accounts",
    sql: `
      SELECT company_id, currency, usage, COUNT(*)::int AS total
      FROM company_payment_accounts
      WHERE is_default = true AND is_active = true
      GROUP BY company_id, currency, usage
      HAVING COUNT(*) > 1
    `,
  },
  {
    check: "company_payment_accounts_plaintext_identifiers",
    sql: `
      SELECT company_payment_account_id AS id, company_id, type
      FROM company_payment_accounts
      WHERE account_number IS NOT NULL
         OR (type IN ('BANK_ACCOUNT', 'DIGITAL_WALLET')
             AND sensitive_identifier_encrypted IS NULL
             AND COALESCE(account_last_four, cci_last_four, wallet_phone_last_four) IS NOT NULL)
    `,
  },
  {
    check: "invalid_company_payment_account_defaults",
    sql: `
      SELECT company_payment_account_id AS id, company_id, currency, usage
      FROM company_payment_accounts
      WHERE is_default = true AND is_active = false
    `,
  },
  {
    check: "supplier_payment_destinations_manual_review",
    sql: `
      SELECT supplier_payment_destination_id AS id, supplier_id, method_id, type, currency, masked_label
      FROM supplier_payment_destinations
      WHERE requires_manual_review = true
      ORDER BY supplier_id, currency, type
    `,
  },
  {
    check: "invalid_supplier_payment_destination_defaults",
    sql: `
      SELECT supplier_payment_destination_id AS id, supplier_id, currency, type
      FROM supplier_payment_destinations
      WHERE is_default = true AND (is_active = false OR requires_manual_review = true)
    `,
  },
  {
    check: "sale_payments_without_order",
    sql: `
      SELECT sp.id, sp.sale_order_id
      FROM sale_payments sp
      LEFT JOIN sale_orders so ON so.id = sp.sale_order_id
      WHERE so.id IS NULL
    `,
  },
  {
    check: "sale_payments_invalid_amount",
    sql: `
      SELECT id, sale_order_id, amount, status
      FROM sale_payments
      WHERE amount <= 0
    `,
  },
  {
    check: "posted_sale_payments_without_valid_method",
    sql: `
      SELECT sp.id, sp.sale_order_id, sp.payment_method_id, sp.method AS legacy_method
      FROM sale_payments sp
      LEFT JOIN payment_methods pm ON pm.method_id = sp.payment_method_id
      WHERE sp.status = 'POSTED'
        AND (pm.method_id IS NULL OR pm.is_active = false)
    `,
  },
  {
    check: "sale_payments_invalid_receiver",
    sql: `
      SELECT sp.id, sp.sale_order_id, sp.company_payment_account_id,
             sp.method AS legacy_method, pm.code AS payment_method_code,
             cpa.is_active, cpa.usage, sp.currency,
             (
               SELECT COUNT(*)::int
               FROM company_payment_accounts candidate
               WHERE candidate.is_active = true
                 AND candidate.usage IN ('INFLOW', 'BOTH')
                 AND candidate.currency::text = sp.currency::text
             ) AS compatible_receiver_candidates,
             (
               SELECT COALESCE(
                 JSON_AGG(JSON_BUILD_OBJECT(
                   'id', candidate.company_payment_account_id,
                   'name', candidate.name,
                   'type', candidate.type,
                   'isDefault', candidate.is_default,
                   'maskedLabel', candidate.masked_label
                 ) ORDER BY candidate.is_default DESC, candidate.name),
                 '[]'::json
               )
               FROM company_payment_accounts candidate
               WHERE candidate.is_active = true
                 AND candidate.usage IN ('INFLOW', 'BOTH')
                 AND candidate.currency::text = sp.currency::text
             ) AS compatible_receivers
      FROM sale_payments sp
      LEFT JOIN company_payment_accounts cpa
        ON cpa.company_payment_account_id = sp.company_payment_account_id
      LEFT JOIN payment_methods pm ON pm.method_id = sp.payment_method_id
      WHERE sp.status = 'POSTED'
        AND (cpa.company_payment_account_id IS NULL
             OR cpa.is_active = false
             OR cpa.usage NOT IN ('INFLOW', 'BOTH')
             OR cpa.currency::text <> sp.currency::text)
    `,
  },
  {
    check: "sale_payments_incompatible_method_receiver",
    sql: `
      SELECT sp.id, sp.sale_order_id, pm.code AS payment_method_code,
             cpa.type AS receiver_type, sp.company_payment_account_id
      FROM sale_payments sp
      INNER JOIN payment_methods pm ON pm.method_id = sp.payment_method_id
      INNER JOIN company_payment_accounts cpa
        ON cpa.company_payment_account_id = sp.company_payment_account_id
      WHERE sp.status = 'POSTED'
        AND ((pm.code = 'CASH' AND cpa.type <> 'CASH')
          OR (pm.code IN ('BANK_TRANSFER', 'CHECK') AND cpa.type <> 'BANK_ACCOUNT')
          OR (pm.code = 'BANK_DEPOSIT' AND cpa.type NOT IN ('BANK_ACCOUNT', 'CASH'))
          OR (pm.code = 'CARD' AND cpa.type <> 'CREDIT_CARD')
          OR (pm.code = 'DIGITAL_WALLET' AND cpa.type <> 'DIGITAL_WALLET'))
    `,
  },
  {
    check: "sale_payments_over_collected",
    sql: `
      SELECT sp.sale_order_id,
             ROUND(SUM(sp.amount), 2) AS collected,
             ROUND(so.total, 2) AS sale_total
      FROM sale_payments sp
      INNER JOIN sale_orders so ON so.id = sp.sale_order_id
      WHERE sp.status = 'POSTED'
      GROUP BY sp.sale_order_id, so.total
      HAVING ROUND(SUM(sp.amount), 2) > ROUND(so.total, 2) + 0.01
    `,
  },
  {
    check: "sale_payments_legacy_receiver_unmapped",
    sql: `
      SELECT id, sale_order_id,
             (to_jsonb(sale_payments)->>'bank_account_id') AS bank_account_id
      FROM sale_payments
      WHERE (to_jsonb(sale_payments)->>'bank_account_id') IS NOT NULL
        AND company_payment_account_id IS NULL
    `,
  },
  {
    check: "legacy_sale_payments_bank_account_column_remaining",
    sql: `
      SELECT column_name AS id
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'sale_payments'
        AND column_name = 'bank_account_id'
    `,
  },
  {
    check: "sale_payments_legacy_bank_account_values",
    sql: `
      SELECT id, sale_order_id,
             (to_jsonb(sale_payments)->>'bank_account_id') AS bank_account_id,
             company_payment_account_id
      FROM sale_payments
      WHERE (to_jsonb(sale_payments)->>'bank_account_id') IS NOT NULL
    `,
  },
  {
    check: "legacy_approved_payment_status",
    sql: `
      SELECT pay_doc_id AS id, po_id, status
      FROM payment_documents
      WHERE status = 'APPROVED'
    `,
  },
];

export async function collectFinancialAudit(dataSource = migrationDataSource): Promise<FinancialAuditCheck[]> {
  const checks: FinancialAuditCheck[] = [];

  for (const query of queries) {
    const details = await dataSource.query(query.sql);
    checks.push({
      check: query.check,
      total: details.length,
      details,
    });
  }

  return checks;
}

export async function runFinancialAudit(options: { summary?: boolean } = {}) {
  await migrationDataSource.initialize();

  try {
    const checks = await collectFinancialAudit(migrationDataSource);
    const outputChecks = options.summary
      ? checks.map(({ check, total }) => ({ check, total }))
      : checks;
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), checks: outputChecks }, null, 2));
    return checks;
  } finally {
    await migrationDataSource.destroy();
  }
}

if (require.main === module) {
  const strict = process.argv.includes("--strict");
  const summary = process.argv.includes("--summary");
  runFinancialAudit({ summary }).then((checks) => {
    if (strict && checks.some((check) => check.total > 0)) {
      console.error("Auditoria estricta fallida: existen hallazgos financieros pendientes.");
      process.exitCode = 2;
    }
  }).catch((error) => {
    console.error("Error ejecutando auditoría financiera:", error);
    process.exit(1);
  });
}
