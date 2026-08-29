import { CreateSaleOrderAdviserImportAliases20260829170000 } from './20260829170000-create-sale-order-adviser-import-aliases';

describe('CreateSaleOrderAdviserImportAliases20260829170000', () => {
  it('creates the mapping table, adviser foreign key and permissions', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    };
    const migration = new CreateSaleOrderAdviserImportAliases20260829170000();

    await migration.up(queryRunner as any);
    const sql = queries.join('\n');

    expect(sql).toContain('sale_order_adviser_import_aliases');
    expect(sql).toContain('REFERENCES advisers(user_id)');
    expect(sql).toContain('sale_orders.adviser_import_aliases.view');
    expect(sql).toContain('sale_orders.adviser_import_aliases.manage');
  });
});
