import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSaleOrderSupplyItems20260811100000 implements MigrationInterface {
  name = 'CreateSaleOrderSupplyItems20260811100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM workflow_supply_recipe_items
          WHERE quantity < 0.01 OR quantity <> ROUND(quantity, 2)
        ) THEN
          RAISE EXCEPTION
            'Existen cantidades de recetas incompatibles con numeric(12,2); corríjalas antes de ejecutar la migración';
        END IF;
      END $$;

      ALTER TABLE workflow_supply_recipe_items
        ALTER COLUMN quantity TYPE numeric(12,2)
        USING quantity::numeric(12,2);
      ALTER TABLE workflow_supply_recipe_items
        DROP CONSTRAINT IF EXISTS chk_workflow_supply_recipe_item_quantity;
      ALTER TABLE workflow_supply_recipe_items
        ADD CONSTRAINT chk_workflow_supply_recipe_item_quantity CHECK (quantity >= 0.01);

      CREATE TABLE IF NOT EXISTS sale_order_supply_items (
        sale_order_supply_item_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_order_id uuid NOT NULL REFERENCES sale_orders(id) ON DELETE CASCADE,
        supply_sku_id uuid NOT NULL REFERENCES pc_skus(sku_id) ON DELETE RESTRICT,
        quantity numeric(12,2) NOT NULL,
        unit_id uuid NOT NULL REFERENCES pc_units(unit_id) ON DELETE RESTRICT,
        reference_recipe_item_id uuid NULL REFERENCES workflow_supply_recipe_items(recipe_item_id) ON DELETE SET NULL,
        supply_name_snapshot varchar(180) NOT NULL,
        sku_name_snapshot varchar(180) NOT NULL,
        backend_sku_snapshot varchar(80) NOT NULL,
        custom_sku_snapshot varchar(80) NULL,
        unit_name_snapshot varchar(180) NOT NULL,
        unit_code_snapshot varchar(50) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_sale_order_supply_item_quantity CHECK (quantity >= 0.01),
        CONSTRAINT ux_sale_order_supply_item_sku UNIQUE (sale_order_id, supply_sku_id)
      );

      CREATE INDEX IF NOT EXISTS idx_sale_order_supply_items_order ON sale_order_supply_items(sale_order_id);
      CREATE INDEX IF NOT EXISTS idx_sale_order_supply_items_sku ON sale_order_supply_items(supply_sku_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS sale_order_supply_items;
      ALTER TABLE workflow_supply_recipe_items
        DROP CONSTRAINT IF EXISTS chk_workflow_supply_recipe_item_quantity;
      ALTER TABLE workflow_supply_recipe_items
        ALTER COLUMN quantity TYPE numeric(12,3) USING quantity::numeric(12,3);
      ALTER TABLE workflow_supply_recipe_items
        ADD CONSTRAINT chk_workflow_supply_recipe_item_quantity CHECK (quantity > 0);
    `);
  }
}
