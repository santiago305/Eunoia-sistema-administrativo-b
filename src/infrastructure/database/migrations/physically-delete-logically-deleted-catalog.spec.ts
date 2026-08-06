import { QueryRunner } from 'typeorm';
import { PhysicallyDeleteLogicallyDeletedCatalog20260806130000 } from './20260806130000-physically-delete-logically-deleted-catalog';

describe('PhysicallyDeleteLogicallyDeletedCatalog20260806130000', () => {
  it('deletes logically deleted catalog records and their business references', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new PhysicallyDeleteLogicallyDeletedCatalog20260806130000();

    await migration.up({ query } as unknown as QueryRunner);

    const sql = query.mock.calls.map(([statement]) => statement).join('\n');

    expect(sql).toContain('WHERE sku.is_deleted = true');
    expect(sql).toContain('OR product.is_deleted = true');
    expect(sql).toContain('DELETE FROM purchase_orders');
    expect(sql).toContain('DELETE FROM production_orders');
    expect(sql).toContain('DELETE FROM pc_recipes');
    expect(sql).toContain('DELETE FROM pc_skus');
    expect(sql).toContain('WHERE product.is_deleted = true');
    expect(sql.indexOf('DELETE FROM pc_inventory_ledger')).toBeLessThan(
      sql.indexOf('DELETE FROM pc_skus'),
    );
  });
});
