import { MigrationInterface, QueryRunner } from "typeorm";
import { SALE_ORDER_PERMISSIONS } from "src/modules/sale-orders/application/constants/sale-order-permissions";

const sqlString = (value: string) => `'${value.replace(/'/g, "''")}'`;

export class HardenFinancialOutboxRetries20261012050000 implements MigrationInterface {
  name = "HardenFinancialOutboxRetries20261012050000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE financial_outbox_events
        ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS manual_retry_count integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS retry_requested_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS retry_requested_by_user_id uuid NULL;
      CREATE INDEX IF NOT EXISTS idx_financial_outbox_ready
        ON financial_outbox_events (next_attempt_at, occurred_at, id)
        WHERE published_at IS NULL AND dead_lettered_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_financial_outbox_dead_letters
        ON financial_outbox_events (dead_lettered_at DESC, id)
        WHERE published_at IS NULL AND dead_lettered_at IS NOT NULL;
    `);

    const permission = SALE_ORDER_PERMISSIONS.find(({ code }) => code === "income.outbox.manage");
    if (permission) {
      await queryRunner.query(`
        INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
        VALUES (${sqlString(permission.code)}, ${sqlString(permission.name)}, ${sqlString(permission.description)},
                ${sqlString(permission.module)}, ${sqlString(permission.resource)}, ${sqlString(permission.action)},
                ${sqlString(permission.type)}, true)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
          module = EXCLUDED.module, resource = EXCLUDED.resource, action = EXCLUDED.action,
          type = EXCLUDED.type, is_active = true
      `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_financial_outbox_dead_letters;
      DROP INDEX IF EXISTS idx_financial_outbox_ready;
      ALTER TABLE financial_outbox_events
        DROP COLUMN IF EXISTS retry_requested_by_user_id,
        DROP COLUMN IF EXISTS retry_requested_at,
        DROP COLUMN IF EXISTS manual_retry_count,
        DROP COLUMN IF EXISTS dead_lettered_at,
        DROP COLUMN IF EXISTS next_attempt_at;
      UPDATE permissions SET is_active = false WHERE code = 'income.outbox.manage';
    `);
  }
}
