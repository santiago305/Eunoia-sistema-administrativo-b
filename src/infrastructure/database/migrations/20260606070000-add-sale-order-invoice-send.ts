import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSaleOrderInvoiceSend20260606070000 implements MigrationInterface {
  name = "AddSaleOrderInvoiceSend20260606070000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE sale_orders ADD COLUMN invoice_send boolean NOT NULL DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sale_orders DROP COLUMN invoice_send`);
  }
}
