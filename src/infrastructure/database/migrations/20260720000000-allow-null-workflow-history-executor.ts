import { MigrationInterface, QueryRunner } from "typeorm";

export class AllowNullWorkflowHistoryExecutor20260720000000 implements MigrationInterface {
  name = "AllowNullWorkflowHistoryExecutor20260720000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sale_order_state_history"
      ALTER COLUMN "executed_by" DROP NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sale_order_state_history"
      ALTER COLUMN "executed_by" SET NOT NULL
    `);
  }
}
