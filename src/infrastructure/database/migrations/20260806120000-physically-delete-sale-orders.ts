import { MigrationInterface, QueryRunner } from 'typeorm';

export class PhysicallyDeleteSaleOrders20260806120000 implements MigrationInterface {
  name = 'PhysicallyDeleteSaleOrders20260806120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM sale_order_state_history`);
    await queryRunner.query(`DELETE FROM sale_orders`);
  }

  public async down(): Promise<void> {
    // La eliminacion fisica de los pedidos no se puede revertir.
  }
}
