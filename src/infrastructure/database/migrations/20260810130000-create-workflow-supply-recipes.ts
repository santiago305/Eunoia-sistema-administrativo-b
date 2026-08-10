import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkflowSupplyRecipes20260810130000
  implements MigrationInterface
{
  name = 'CreateWorkflowSupplyRecipes20260810130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_supply_recipes (
        recipe_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        version integer NOT NULL DEFAULT 1,
        notes text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ux_workflow_supply_recipes_workflow UNIQUE (workflow_id)
      );

      CREATE TABLE IF NOT EXISTS workflow_supply_recipe_items (
        recipe_item_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        recipe_id uuid NOT NULL REFERENCES workflow_supply_recipes(recipe_id) ON DELETE CASCADE,
        supply_sku_id uuid NOT NULL REFERENCES pc_skus(sku_id) ON DELETE RESTRICT,
        quantity numeric(12,3) NOT NULL,
        unit_id uuid NOT NULL REFERENCES pc_units(unit_id) ON DELETE RESTRICT,
        CONSTRAINT chk_workflow_supply_recipe_item_quantity CHECK (quantity > 0),
        CONSTRAINT ux_workflow_supply_recipe_item_sku UNIQUE (recipe_id, supply_sku_id)
      );

      CREATE INDEX IF NOT EXISTS idx_workflow_supply_recipe_items_recipe
        ON workflow_supply_recipe_items(recipe_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_supply_recipe_items_sku
        ON workflow_supply_recipe_items(supply_sku_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS workflow_supply_recipe_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS workflow_supply_recipes`);
  }
}
