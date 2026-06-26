import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRecurringPurchases20260626090000 implements MigrationInterface {
  name = "CreateRecurringPurchases20260626090000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS recurring_purchase_templates (
        recurring_purchase_template_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        supplier_id uuid NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
        name varchar(160) NOT NULL,
        description text NULL,
        frequency varchar(20) NOT NULL,
        purchase_type purchase_type NOT NULL DEFAULT 'SUBSCRIPTION',
        currency currency_type NOT NULL,
        amount numeric(12,2) NOT NULL,
        start_date date NOT NULL,
        next_due_date date NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'ACTIVE',
        reminder_days_before jsonb NOT NULL DEFAULT '[7,3,1]'::jsonb,
        created_by_user_id uuid NULL,
        last_generated_at timestamptz NULL,
        last_generated_period_key varchar(20) NULL,
        last_generated_purchase_id uuid NULL,
        last_generated_account_payable_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_recurring_purchase_templates_frequency CHECK (frequency IN ('MONTHLY', 'ANNUAL')),
        CONSTRAINT chk_recurring_purchase_templates_status CHECK (status IN ('ACTIVE', 'PAUSED', 'CANCELLED')),
        CONSTRAINT chk_recurring_purchase_templates_amount CHECK (amount > 0)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_recurring_purchase_templates_status_due ON recurring_purchase_templates (status, next_due_date);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_recurring_purchase_templates_supplier ON recurring_purchase_templates (supplier_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_orders_recurring_template ON purchase_orders (recurring_template_id);`);

    await queryRunner.query(`
      INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
      VALUES
        ('page.recurring-purchases.view', 'Ver compras recurrentes', 'Acceso a la pantalla de compras recurrentes', 'recurring_purchases', 'recurring_purchases', 'view', 'page', true),
        ('recurring_purchases.view', 'Consultar compras recurrentes', 'Consultar plantillas de compras recurrentes', 'recurring_purchases', 'recurring_purchases', 'view', 'action', true),
        ('recurring_purchases.create', 'Crear compras recurrentes', 'Crear plantillas de compras recurrentes', 'recurring_purchases', 'recurring_purchases', 'create', 'action', true),
        ('recurring_purchases.edit', 'Editar compras recurrentes', 'Editar plantillas de compras recurrentes', 'recurring_purchases', 'recurring_purchases', 'edit', 'action', true),
        ('recurring_purchases.pause', 'Pausar compras recurrentes', 'Pausar o reanudar compras recurrentes', 'recurring_purchases', 'recurring_purchases', 'pause', 'action', true),
        ('recurring_purchases.cancel', 'Cancelar compras recurrentes', 'Cancelar compras recurrentes', 'recurring_purchases', 'recurring_purchases', 'cancel', 'action', true),
        ('recurring_purchases.pay', 'Generar cuenta por pagar recurrente', 'Generar la cuenta por pagar del periodo recurrente', 'recurring_purchases', 'recurring_purchases', 'pay', 'action', true)
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
    // Additive migration. Keep recurring financial history intact on rollback.
  }
}
