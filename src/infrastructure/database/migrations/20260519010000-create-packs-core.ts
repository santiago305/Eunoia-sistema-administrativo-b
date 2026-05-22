import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePacksCore20260519010000 implements MigrationInterface {
  name = "CreatePacksCore20260519010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS packs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        description varchar(255) NOT NULL,
        total numeric(12, 2) NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pack_items (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        pack_id uuid NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
        sku_id uuid NOT NULL REFERENCES pc_skus(sku_id) ON DELETE RESTRICT,
        quantity numeric(12, 2) NOT NULL,
        price numeric(12, 2) NOT NULL,
        CONSTRAINT chk_pack_items_quantity CHECK (quantity > 0),
        CONSTRAINT chk_pack_items_price CHECK (price >= 0),
        CONSTRAINT ux_pack_items_pack_sku UNIQUE (pack_id, sku_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pack_items_pack_id
      ON pack_items (pack_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pack_items_sku_id
      ON pack_items (sku_id)
    `);
  }

  public async down(): Promise<void> {
    // No-op: migracion idempotente, no debe eliminar data.
  }
}

