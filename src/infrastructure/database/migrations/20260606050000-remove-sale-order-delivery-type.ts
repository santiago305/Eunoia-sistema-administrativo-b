import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveSaleOrderDeliveryType20260606050000 implements MigrationInterface {
  name = "RemoveSaleOrderDeliveryType20260606050000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sale_orders DROP COLUMN IF EXISTS delivery_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS delivery_type`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE delivery_type AS ENUM ('ABONADO_ENVIO', 'CONTRA_ENTREGA')`);
    await queryRunner.query(`ALTER TABLE sale_orders ADD COLUMN delivery_type delivery_type NULL`);
  }
}
