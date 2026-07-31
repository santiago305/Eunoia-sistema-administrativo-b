import { MigrationInterface, QueryRunner } from "typeorm";

export class HardenSaleOrderTrackingFlags20260731131000 implements MigrationInterface {
  name = "HardenSaleOrderTrackingFlags20260731131000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE sale_orders SET prepared = false WHERE prepared IS NULL",
    );
    await queryRunner.query(
      "UPDATE sale_orders SET preguide = false WHERE preguide IS NULL",
    );
    await queryRunner.query(
      "ALTER TABLE sale_orders ALTER COLUMN prepared SET DEFAULT false",
    );
    await queryRunner.query(
      "ALTER TABLE sale_orders ALTER COLUMN prepared SET NOT NULL",
    );
    await queryRunner.query(
      "ALTER TABLE sale_orders ALTER COLUMN preguide SET DEFAULT false",
    );
    await queryRunner.query(
      "ALTER TABLE sale_orders ALTER COLUMN preguide SET NOT NULL",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE sale_orders ALTER COLUMN prepared DROP NOT NULL",
    );
    await queryRunner.query(
      "ALTER TABLE sale_orders ALTER COLUMN preguide DROP NOT NULL",
    );
  }
}
