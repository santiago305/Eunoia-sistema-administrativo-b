import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCompanyPaymentAccountsAndScheduledPayments20260622130000 implements MigrationInterface {
  name = "CreateCompanyPaymentAccountsAndScheduledPayments20260622130000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS company_payment_accounts (
        company_payment_account_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id uuid NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
        type varchar(30) NOT NULL,
        name varchar(150) NOT NULL,
        bank_name varchar(120) NULL,
        account_number varchar(120) NULL,
        account_last_four varchar(4) NULL,
        card_last_four varchar(4) NULL,
        wallet_name varchar(120) NULL,
        currency currency_type NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_company_payment_accounts_company ON company_payment_accounts (company_id);`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_company_payment_accounts_company_number'
        ) THEN
          ALTER TABLE company_payment_accounts
          ADD CONSTRAINT uq_company_payment_accounts_company_number UNIQUE (company_id, account_number);
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE payment_documents ADD COLUMN IF NOT EXISTS company_payment_account_id uuid NULL;`);
    await queryRunner.query(`ALTER TABLE payment_documents ADD COLUMN IF NOT EXISTS payment_method_id uuid NULL;`);
    await queryRunner.query(`ALTER TABLE payment_documents ADD COLUMN IF NOT EXISTS paid_by_user_id uuid NULL;`);
    await queryRunner.query(`ALTER TABLE payment_documents ADD COLUMN IF NOT EXISTS scheduled_by_user_id uuid NULL;`);
    await queryRunner.query(`ALTER TABLE payment_documents ADD COLUMN IF NOT EXISTS scheduled_at timestamptz NULL;`);
    await queryRunner.query(`ALTER TABLE payment_documents ADD COLUMN IF NOT EXISTS paid_at timestamptz NULL;`);
    await queryRunner.query(`ALTER TABLE payment_documents ADD COLUMN IF NOT EXISTS payment_evidence_file_id uuid NULL;`);
    await queryRunner.query(`ALTER TABLE payment_documents ADD COLUMN IF NOT EXISTS bank_name varchar(120) NULL;`);
    await queryRunner.query(`ALTER TABLE payment_documents ADD COLUMN IF NOT EXISTS card_last_four varchar(4) NULL;`);
    await queryRunner.query(`ALTER TABLE payment_documents ADD COLUMN IF NOT EXISTS operation_code varchar(80) NULL;`);
    await queryRunner.query(`ALTER TABLE payment_documents ADD COLUMN IF NOT EXISTS is_partial boolean NOT NULL DEFAULT false;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_documents_company_payment_account ON payment_documents (company_payment_account_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_documents_scheduled_at ON payment_documents (scheduled_at);`);

    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
      VALUES
        ('page.payment-accounts.view', 'Ver cuentas de pago', 'Acceso a pantalla de cuentas/tarjetas de pago de empresa', 'payment_accounts', 'payment_accounts', 'view', 'page', true),
        ('payment_accounts.view', 'Consultar cuentas de pago', 'Consultar cuentas/tarjetas/cajas de pago de empresa', 'payment_accounts', 'payment_accounts', 'view', 'action', true),
        ('payment_accounts.create', 'Crear cuentas de pago', 'Crear cuentas/tarjetas/cajas de pago de empresa', 'payment_accounts', 'payment_accounts', 'create', 'action', true),
        ('payment_accounts.edit', 'Editar cuentas de pago', 'Editar cuentas/tarjetas/cajas de pago de empresa', 'payment_accounts', 'payment_accounts', 'edit', 'action', true),
        ('payment_accounts.disable', 'Desactivar cuentas de pago', 'Activar o desactivar cuentas/tarjetas/cajas de pago de empresa', 'payment_accounts', 'payment_accounts', 'disable', 'action', true)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        module = EXCLUDED.module,
        resource = EXCLUDED.resource,
        action = EXCLUDED.action,
        type = EXCLUDED.type,
        is_active = EXCLUDED.is_active;
    `);
  }

  public async down(): Promise<void> {
    // Additive migration. Keep financial data and permissions intact on rollback.
  }
}
