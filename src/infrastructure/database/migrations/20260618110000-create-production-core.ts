import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProductionCore20260618110000 implements MigrationInterface {
  name = "CreateProductionCore20260618110000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS production_order_items (
        item_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        production_id uuid NOT NULL REFERENCES production_orders(production_id) ON DELETE CASCADE,
        finished_item_id uuid NOT NULL REFERENCES pc_skus(sku_id),
        from_location_id uuid REFERENCES warehouse_locations(id),
        to_location_id uuid REFERENCES warehouse_locations(id),
        quantity int NOT NULL,
        waste_qty numeric(12,6) NOT NULL DEFAULT 0,
        unit_cost numeric NOT NULL
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_production_items_production ON production_order_items(production_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_production_items_finished_item ON production_order_items(finished_item_id);`);
  }

  public async down(): Promise<void> {
    // Non-destructive by design.
  }
}
