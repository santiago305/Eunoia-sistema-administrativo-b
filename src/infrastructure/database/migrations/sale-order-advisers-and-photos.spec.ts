import { AddSaleOrderAdvisersAndPhotos20260703000000 } from './20260703000000-add-sale-order-advisers-and-photos';

describe('AddSaleOrderAdvisersAndPhotos20260703000000', () => {
  it('defines the complete additive and reversible schema change', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    };
    const migration = new AddSaleOrderAdvisersAndPhotos20260703000000();

    await migration.up(queryRunner as never);
    const upSql = queries.join('\n');

    expect(upSql).toContain('CREATE TABLE IF NOT EXISTS advisers');
    expect(upSql).toContain('send_date');
    expect(upSql).toContain('send_photo');
    expect(upSql).toContain('send_code');
    expect(upSql).toContain('send_address');
    expect(upSql).toContain('assigned_by');
    expect(upSql).toContain('payment_photo');
    expect(upSql).toContain('idx_sale_orders_assigned_by');

    queries.length = 0;
    await migration.down(queryRunner as never);
    const downSql = queries.join('\n');

    expect(downSql).toContain('DROP COLUMN IF EXISTS payment_photo');
    expect(downSql).toContain('DROP TABLE IF EXISTS advisers');
  });
});
