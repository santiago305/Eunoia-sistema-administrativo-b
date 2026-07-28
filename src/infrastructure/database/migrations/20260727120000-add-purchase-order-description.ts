import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPurchaseOrderDescription20260727120000
  implements MigrationInterface
{
  name = "AddPurchaseOrderDescription20260727120000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_orders
      ADD COLUMN IF NOT EXISTS description text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_orders
      DROP COLUMN IF EXISTS description
    `);
  }
}
