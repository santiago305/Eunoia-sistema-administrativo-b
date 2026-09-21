import { MigrationInterface, QueryRunner } from 'typeorm';

export class PhysicallyDeleteSaleOrders20260806120000 implements MigrationInterface {
  name = 'PhysicallyDeleteSaleOrders20260806120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        order_references bigint;
      BEGIN
        SELECT count(*)
        INTO order_references
        FROM sale_order_items;

        IF order_references = 0 THEN
          DELETE FROM sale_order_state_history;
          DELETE FROM sale_orders;
        ELSE
          RAISE NOTICE 'Physical sale-order deletion skipped to preserve % item references', order_references;
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // La eliminacion fisica de los pedidos no se puede revertir.
  }
}
