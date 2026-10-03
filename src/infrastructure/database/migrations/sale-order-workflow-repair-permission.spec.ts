import { AddSaleOrderWorkflowRepairPermission20261003000000 } from './20261003000000-add-sale-order-workflow-repair-permission';
import { databaseMigrations } from '../typeorm.config';

describe('AddSaleOrderWorkflowRepairPermission20261003000000', () => {
  it('is registered in the TypeORM migration list', () => {
    expect(databaseMigrations).toContain(
      AddSaleOrderWorkflowRepairPermission20261003000000,
    );
  });

  it('upserts the repair permission and removes it on rollback', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    };
    const migration = new AddSaleOrderWorkflowRepairPermission20261003000000();

    await migration.up(queryRunner as never);
    expect(queries[0]).toContain("'sale_orders.repair_workflow'");
    expect(queries[0]).toContain('ON CONFLICT (code) DO UPDATE SET');

    queries.length = 0;
    await migration.down(queryRunner as never);
    expect(queries[0]).toContain(
      "DELETE FROM permissions WHERE code = 'sale_orders.repair_workflow'",
    );
  });
});
