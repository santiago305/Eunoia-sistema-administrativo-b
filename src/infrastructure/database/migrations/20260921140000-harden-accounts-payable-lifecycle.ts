import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Makes accounts_payable the canonical obligation ledger while preserving all
 * payment documents and legacy quota rows for compatibility and auditability.
 */
export class HardenAccountsPayableLifecycle20260921140000 implements MigrationInterface {
  name = "HardenAccountsPayableLifecycle20260921140000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE accounts_payable
        ADD COLUMN IF NOT EXISTS requires_manual_review boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS reconciliation_note text NULL;
    `);

    // Every credit quota becomes one canonical payable if it does not have one.
    await queryRunner.query(`
      INSERT INTO accounts_payable
        (purchase_id, quota_id, supplier_id, description, currency, amount_total,
         amount_paid, amount_pending, due_date, status)
      SELECT cq.po_id, cq.quota_id, po.supplier_id,
             'Cuota ' || cq.number,
             COALESCE(po.currency, 'PEN')::currency_type,
             cq.total_to_pay, GREATEST(0, LEAST(cq.total_to_pay, cq.total_paid)),
             GREATEST(0, cq.total_to_pay - GREATEST(0, LEAST(cq.total_to_pay, cq.total_paid))),
             cq.expiration_date,
             CASE WHEN cq.total_paid >= cq.total_to_pay THEN 'PAID'
                  WHEN cq.total_paid > 0 THEN 'PARTIAL' ELSE 'PENDING' END
      FROM credit_quotas cq
      JOIN purchase_orders po ON po.po_id = cq.po_id
      WHERE cq.po_id IS NOT NULL
        AND cq.total_to_pay > 0
        AND NOT EXISTS (
          SELECT 1 FROM accounts_payable ap
          WHERE ap.purchase_id = cq.po_id AND ap.quota_id = cq.quota_id
        );
    `);

    // Cash purchases also have an obligation, even when payment is immediate.
    await queryRunner.query(`
      INSERT INTO accounts_payable
        (purchase_id, supplier_id, description, currency, amount_total,
         amount_paid, amount_pending, due_date, status)
      SELECT po.po_id, po.supplier_id, 'Obligación de compra al contado',
             COALESCE(po.currency, 'PEN')::currency_type, po.total,
             0, po.total, COALESCE(po.date_expiration::date, po.date_issue::date, CURRENT_DATE), 'PENDING'
      FROM purchase_orders po
      WHERE po.payment_form = 'CONTADO'
        AND po.total > 0
        AND NOT EXISTS (
          SELECT 1 FROM accounts_payable ap
          WHERE ap.purchase_id = po.po_id AND ap.quota_id IS NULL
        );
    `);

    // Link legacy payment documents to their canonical payable.
    await queryRunner.query(`
      UPDATE payment_documents pd
      SET account_payable_id = ap.account_payable_id
      FROM accounts_payable ap
      WHERE pd.account_payable_id IS NULL
        AND pd.quota_id IS NOT NULL
        AND ap.quota_id = pd.quota_id;
    `);
    await queryRunner.query(`
      UPDATE payment_documents pd
      SET account_payable_id = ap.account_payable_id
      FROM accounts_payable ap
      WHERE pd.account_payable_id IS NULL
        AND pd.quota_id IS NULL
        AND pd.po_id = ap.purchase_id
        AND ap.quota_id IS NULL;
    `);

    // Reconcile balances from approved payment documents without deleting history.
    await queryRunner.query(`
      WITH payment_totals AS (
        SELECT account_payable_id, SUM(amount)::numeric(12,2) AS total_paid
        FROM payment_documents
        WHERE account_payable_id IS NOT NULL AND status = 'APPROVED'
        GROUP BY account_payable_id
      )
      UPDATE accounts_payable ap
      SET amount_paid = LEAST(ap.amount_total, GREATEST(0, pt.total_paid)),
          amount_pending = GREATEST(0, ap.amount_total - LEAST(ap.amount_total, GREATEST(0, pt.total_paid))),
          status = CASE WHEN pt.total_paid >= ap.amount_total THEN 'PAID'
                        WHEN pt.total_paid > 0 THEN 'PARTIAL' ELSE 'PENDING' END,
          requires_manual_review = pt.total_paid > ap.amount_total,
          reconciliation_note = CASE WHEN pt.total_paid > ap.amount_total
            THEN 'Los pagos aprobados superan el total; revisar antes de aplicar ajustes.' ELSE NULL END
      FROM payment_totals pt
      WHERE ap.account_payable_id = pt.account_payable_id;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE accounts_payable ADD CONSTRAINT chk_accounts_payable_positive_total
          CHECK (amount_total > 0) NOT VALID;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE accounts_payable ADD CONSTRAINT chk_accounts_payable_nonnegative_amounts
          CHECK (amount_paid >= 0 AND amount_pending >= 0) NOT VALID;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE accounts_payable ADD CONSTRAINT chk_accounts_payable_balanced_amounts
          CHECK (abs(amount_total - amount_paid - amount_pending) <= 0.01) NOT VALID;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_accounts_payable_manual_review ON accounts_payable (requires_manual_review) WHERE requires_manual_review = true;`);
  }

  public async down(): Promise<void> {
    // Intentionally additive: financial records and their audit trail are never deleted.
  }
}
