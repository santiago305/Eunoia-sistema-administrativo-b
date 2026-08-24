import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryMovementEffectiveDate20260824000000
  implements MigrationInterface
{
  name = 'AddInventoryMovementEffectiveDate20260824000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pc_inventory_documents
      ADD COLUMN IF NOT EXISTS effective_date date NULL
    `);

    await queryRunner.query(`
      UPDATE pc_inventory_documents AS document
      SET effective_date = COALESCE(
        sale_order.delivery_date,
        (COALESCE(document.posted_at, document.created_at) AT TIME ZONE 'America/Lima')::date
      )
      FROM sale_orders AS sale_order
      WHERE document.reference_type = 'SALE_ORDER'
        AND document.reference_id = sale_order.id
        AND document.effective_date IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pc_inventory_documents
      DROP COLUMN IF EXISTS effective_date
    `);
  }
}
