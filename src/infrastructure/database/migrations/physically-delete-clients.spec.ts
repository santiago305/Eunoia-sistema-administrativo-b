import { QueryRunner } from 'typeorm';
import { PhysicallyDeleteClients20260810120000 } from './20260810120000-physically-delete-clients';

describe('PhysicallyDeleteClients20260810120000', () => {
  it('deletes clients only when there are no sale orders', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new PhysicallyDeleteClients20260810120000();

    await migration.up({ query } as unknown as QueryRunner);

    expect(query).toHaveBeenCalledTimes(1);
    const sql = String(query.mock.calls[0][0]);

    expect(sql).toContain('IF EXISTS (SELECT 1 FROM sale_orders LIMIT 1)');
    expect(sql).toContain('RAISE NOTICE');
    expect(sql).toContain('DELETE FROM clients');
    expect(sql).not.toContain('DELETE FROM sale_orders');
  });
});
