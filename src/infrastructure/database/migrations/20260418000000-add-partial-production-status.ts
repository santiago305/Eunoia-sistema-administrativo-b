import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPartialProductionStatus20260418000000 implements MigrationInterface {
  name = "AddPartialProductionStatus20260418000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE production_status
      ADD VALUE IF NOT EXISTS 'PARTIAL' AFTER 'IN_PROGRESS'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rowsUsingPartial = await queryRunner.query(`
      SELECT COUNT(*)::int AS total
      FROM production_orders
      WHERE status::text = 'PARTIAL'
    `);

    if (Number(rowsUsingPartial[0]?.total ?? 0) > 0) {
      throw new Error("No se puede revertir production_status: existen ordenes de produccion en estado PARTIAL.");
    }

    await queryRunner.query(`
      ALTER TABLE production_orders
      ALTER COLUMN status DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TYPE production_status
      RENAME TO production_status_old
    `);

    await queryRunner.query(`
      CREATE TYPE production_status AS ENUM ('DRAFT','IN_PROGRESS','COMPLETED','CANCELLED')
    `);

    await queryRunner.query(`
      ALTER TABLE production_orders
      ALTER COLUMN status TYPE production_status
      USING status::text::production_status
    `);

    await queryRunner.query(`
      ALTER TABLE production_orders
      ALTER COLUMN status SET DEFAULT 'DRAFT'
    `);

    await queryRunner.query(`
      DROP TYPE production_status_old
    `);
  }
}
