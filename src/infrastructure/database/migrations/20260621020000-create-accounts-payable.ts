import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAccountsPayable20260621020000 implements MigrationInterface {
  name = "CreateAccountsPayable20260621020000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS accounts_payable (
        account_payable_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        purchase_id uuid NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
        quota_id uuid NULL REFERENCES credit_quotas(quota_id) ON DELETE SET NULL,
        supplier_id uuid NULL REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
        description varchar(250),
        currency currency_type NOT NULL,
        amount_total numeric(12,2) NOT NULL,
        amount_paid numeric(12,2) NOT NULL DEFAULT 0,
        amount_pending numeric(12,2) NOT NULL,
        due_date date,
        status varchar(20) NOT NULL DEFAULT 'PENDING',
        created_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_payable_purchase_quota
      ON accounts_payable (purchase_id, COALESCE(quota_id, '00000000-0000-0000-0000-000000000000'::uuid));
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_accounts_payable_purchase ON accounts_payable (purchase_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_accounts_payable_quota ON accounts_payable (quota_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_accounts_payable_status ON accounts_payable (status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_accounts_payable_due_date ON accounts_payable (due_date);`);

    await queryRunner.query(`
      ALTER TABLE payment_documents
      ADD COLUMN IF NOT EXISTS account_payable_id uuid NULL REFERENCES accounts_payable(account_payable_id) ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_documents_account_payable
      ON payment_documents (account_payable_id);
    `);

    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_system, is_active)
      VALUES
        ('accounts-payable.view', 'Consultar cuentas por pagar', 'Consultar cuentas por pagar y sus saldos', 'accounts_payable', 'accounts_payable', 'view', 'action', true, true),
        ('accounts-payable.manage', 'Gestionar cuentas por pagar', 'Registrar pagos asociados a cuentas por pagar', 'accounts_payable', 'accounts_payable', 'manage', 'action', true, true),
        ('accounts-payable.mark_overdue', 'Marcar cuentas vencidas', 'Actualizar cuentas por pagar vencidas', 'accounts_payable', 'accounts_payable', 'mark_overdue', 'action', true, true),
        ('page.accounts-payable.view', 'Ver cuentas por pagar', 'Acceso a pantalla de cuentas por pagar', 'accounts_payable', 'accounts_payable', 'view', 'page', true, true)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        module = EXCLUDED.module,
        resource = EXCLUDED.resource,
        action = EXCLUDED.action,
        type = EXCLUDED.type,
        is_system = true,
        is_active = true,
        updated_at = now();
    `);
  }

  public async down(): Promise<void> {
    // No-op: migration is intentionally additive/idempotent.
  }
}

