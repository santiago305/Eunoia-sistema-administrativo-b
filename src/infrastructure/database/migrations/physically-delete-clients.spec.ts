import { QueryRunner } from 'typeorm';
import { PhysicallyDeleteClients20260810120000 } from './20260810120000-physically-delete-clients';

describe('PhysicallyDeleteClients20260810120000', () => {
  it('physically deletes clients without deleting sale orders', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new PhysicallyDeleteClients20260810120000();

    await migration.up({ query } as unknown as QueryRunner);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith('DELETE FROM clients');
    expect(query.mock.calls.flat().join('\n')).not.toContain('sale_orders');
  });
});
