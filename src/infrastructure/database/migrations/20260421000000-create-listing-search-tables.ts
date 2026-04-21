import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateListingSearchTables20260421000000 implements MigrationInterface {
  name = "CreateListingSearchTables20260421000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_search_recent (
        recent_search_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL,
        table_key varchar(80) NOT NULL,
        snapshot_hash varchar(64) NOT NULL,
        snapshot jsonb NOT NULL,
        last_used_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_search_recent_user_table_hash
      ON purchase_search_recent (user_id, table_key, snapshot_hash)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_search_recent_user_table
      ON purchase_search_recent (user_id, table_key)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_search_metrics (
        metric_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL,
        table_key varchar(80) NOT NULL,
        name varchar(120) NOT NULL,
        snapshot jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_search_metrics_user_table
      ON purchase_search_metrics (user_id, table_key)
    `);
  }

  public async down(): Promise<void> {
    // No-op: la migracion es idempotente y no debe eliminar datos de busquedas si las tablas ya existian.
  }
}
