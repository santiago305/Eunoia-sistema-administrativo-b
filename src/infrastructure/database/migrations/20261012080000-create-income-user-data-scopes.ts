import { MigrationInterface, QueryRunner } from "typeorm";

/** Add explicit user-level branch/account/client scopes for financial income data. */
export class CreateIncomeUserDataScopes20261012080000 implements MigrationInterface {
  name = "CreateIncomeUserDataScopes20261012080000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_financial_data_scopes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        scope_type varchar(32) NOT NULL CHECK (scope_type IN ('SUBSIDIARY', 'PAYMENT_ACCOUNT', 'CLIENT')),
        scope_id uuid NOT NULL,
        created_by_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_user_financial_data_scope UNIQUE (user_id, scope_type, scope_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_financial_data_scopes_lookup
        ON user_financial_data_scopes (user_id, scope_type, scope_id);

      CREATE TABLE IF NOT EXISTS user_financial_data_scope_audits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        target_user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
        actor_user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL,
        before_scopes jsonb NOT NULL,
        after_scopes jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_user_financial_data_scope_audits_target
        ON user_financial_data_scope_audits (target_user_id, created_at DESC);

      INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)
      VALUES ('income.scope.manage', 'Gestionar alcances financieros', 'Asignar sucursales, cuentas y clientes visibles en Ingresos', 'income', 'income_scope', 'manage', 'action', true)
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    // Forward-only: do not remove assignments or audit records during application rollback.
  }
}
