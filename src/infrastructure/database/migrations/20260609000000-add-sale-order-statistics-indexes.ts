import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSaleOrderStatisticsIndexes20260609000000 implements MigrationInterface {
  name = "AddSaleOrderStatisticsIndexes20260609000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_sale_orders_workflow ON sale_orders (workflow_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_sale_orders_current_state ON sale_orders (current_state_id)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sale_orders_current_state`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sale_orders_workflow`);
  }
}
