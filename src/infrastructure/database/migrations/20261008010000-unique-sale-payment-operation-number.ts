import { MigrationInterface, QueryRunner } from "typeorm";

export class UniqueSalePaymentOperationNumber20261008010000 implements MigrationInterface {
  name = "UniqueSalePaymentOperationNumber20261008010000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_sale_payments_operation_number_normalized
      ON sale_payments (LOWER(BTRIM(operation_number)))
      WHERE operation_number IS NOT NULL AND BTRIM(operation_number) <> '';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_sale_payments_operation_number_normalized`);
  }
}
