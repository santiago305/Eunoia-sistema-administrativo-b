import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSaleOrderImportLotes20260730090000 implements MigrationInterface {
  name = "CreateSaleOrderImportLotes20260730090000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.query(`
      ALTER TABLE sale_orders
      ADD COLUMN IF NOT EXISTS lotes int NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lotes_imports (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        lote int NOT NULL,
        created_at timestamptz NOT NULL DEFAULT timezone('America/Lima', CURRENT_TIMESTAMP),
        created_by uuid NOT NULL REFERENCES users(user_id),
        is_active boolean NOT NULL DEFAULT true,
        CONSTRAINT uq_lotes_imports_lote UNIQUE (lote)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lotes_auditory (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        lote_id uuid NOT NULL REFERENCES lotes_imports(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT timezone('America/Lima', CURRENT_TIMESTAMP),
        executed_by uuid NOT NULL REFERENCES users(user_id),
        action_execution varchar(20) NOT NULL,
        CONSTRAINT chk_lotes_auditory_action CHECK (action_execution IN ('delete', 'restore'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sale_orders_lotes
      ON sale_orders (lotes)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lotes_imports_active_created
      ON lotes_imports (is_active, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lotes_auditory_lote_created
      ON lotes_auditory (lote_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lotes_auditory_lote_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lotes_imports_active_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sale_orders_lotes`);
    await queryRunner.query(`DROP TABLE IF EXISTS lotes_auditory`);
    await queryRunner.query(`DROP TABLE IF EXISTS lotes_imports`);
    await queryRunner.query(`ALTER TABLE sale_orders DROP COLUMN IF EXISTS lotes`);
  }
}
