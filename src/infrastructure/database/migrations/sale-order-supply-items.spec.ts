import { QueryRunner } from 'typeorm';
import { CreateSaleOrderSupplyItems20260811100000 } from './20260811100000-create-sale-order-supply-items';

describe('CreateSaleOrderSupplyItems20260811100000', () => {
  it('creates independent order supplies and safely validates existing recipe quantities', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new CreateSaleOrderSupplyItems20260811100000().up({ query } as unknown as QueryRunner);

    const sql = query.mock.calls.flat().join('\n');
    expect(sql).toContain('quantity <> ROUND(quantity, 2)');
    expect(sql).toContain('RAISE EXCEPTION');
    expect(sql).toContain('ALTER COLUMN quantity TYPE numeric(12,2)');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS sale_order_supply_items');
    expect(sql).toContain('sale_order_id uuid NOT NULL REFERENCES sale_orders(id) ON DELETE CASCADE');
    expect(sql).toContain('quantity numeric(12,2) NOT NULL');
    expect(sql).toContain('CHECK (quantity >= 0.01)');
    expect(sql).toContain('UNIQUE (sale_order_id, supply_sku_id)');
    expect(sql).toContain('reference_recipe_item_id uuid NULL');
    expect(sql).toContain('supply_name_snapshot varchar(180) NOT NULL');
  });
});
