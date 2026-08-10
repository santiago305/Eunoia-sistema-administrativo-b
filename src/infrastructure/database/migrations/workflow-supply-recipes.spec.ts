import { QueryRunner } from 'typeorm';
import { CreateWorkflowSupplyRecipes20260810130000 } from './20260810130000-create-workflow-supply-recipes';

describe('CreateWorkflowSupplyRecipes20260810130000', () => {
  it('creates one recipe per workflow with supply SKU items', async () => {
    const query = jest.fn().mockResolvedValue(undefined);

    await new CreateWorkflowSupplyRecipes20260810130000().up({
      query,
    } as unknown as QueryRunner);

    const sql = query.mock.calls.flat().join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS workflow_supply_recipes');
    expect(sql).toContain('workflow_id uuid NOT NULL REFERENCES workflows(id)');
    expect(sql).toContain('UNIQUE (workflow_id)');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS workflow_supply_recipe_items');
    expect(sql).toContain('supply_sku_id uuid NOT NULL REFERENCES pc_skus(sku_id)');
    expect(sql).toContain('CHECK (quantity > 0)');
  });
});
