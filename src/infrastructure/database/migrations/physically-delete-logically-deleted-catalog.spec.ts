import { QueryRunner } from 'typeorm';
import { PhysicallyDeleteLogicallyDeletedCatalog20260806130000 } from './20260806130000-physically-delete-logically-deleted-catalog';

describe('PhysicallyDeleteLogicallyDeletedCatalog20260806130000', () => {
  it('preserves historical catalog records and emits a reviewed-cleanup notice', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new PhysicallyDeleteLogicallyDeletedCatalog20260806130000();

    await migration.up({ query } as unknown as QueryRunner);

    const sql = query.mock.calls.map(([statement]) => statement).join('\n');

    expect(sql).toContain('Logical catalog cleanup skipped');
    expect(sql).not.toContain('DELETE FROM');
  });
});
