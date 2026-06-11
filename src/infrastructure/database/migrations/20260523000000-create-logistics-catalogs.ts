import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLogisticsCatalogs20260523000000 implements MigrationInterface {
  name = "CreateLogisticsCatalogs20260523000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        detail varchar(300),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        department varchar NOT NULL,
        province varchar NOT NULL,
        district varchar NOT NULL,
        address varchar,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS warehouse_locations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        code varchar NOT NULL,
        description varchar,
        is_active boolean NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouse_locations_warehouse_id_code
      ON warehouse_locations(warehouse_id, code)
    `);
  }

  public async down(): Promise<void> {
    // No-op: base catalog data should not be dropped by rollback.
  }
}
