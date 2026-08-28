import { databaseMigrations } from '../typeorm.config';
import { AddSaleOrdersAdvancedPermission20260822120000 } from './20260822120000-add-sale-orders-advanced-permission';
import { UpdateSaleOrdersAdvancedPermissionDescription20260828130000 } from './20260828130000-update-sale-orders-advanced-permission-description';

describe('AddSaleOrdersAdvancedPermission20260822120000', () => {
  it('is registered and creates only the Pedidos avanzados permission', async () => {
    expect(databaseMigrations).toContain(
      AddSaleOrdersAdvancedPermission20260822120000,
    );
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    };
    const migration = new AddSaleOrdersAdvancedPermission20260822120000();

    await migration.up(queryRunner as never);
    const upSql = queries.join('\n');
    expect(upSql).toContain("'sale_orders.advanced_orders'");
    expect(upSql).toContain("'Pedidos avanzados'");
    expect(upSql).toContain('ON CONFLICT (code) DO UPDATE SET');

    queries.length = 0;
    await migration.down(queryRunner as never);
    expect(queries.join('\n')).toContain(
      "WHERE code = 'sale_orders.advanced_orders'",
    );
  });
});

describe('UpdateSaleOrdersAdvancedPermissionDescription20260828130000', () => {
  it('is registered and includes type and warehouse in the permission description', async () => {
    expect(databaseMigrations).toContain(
      UpdateSaleOrdersAdvancedPermissionDescription20260828130000,
    );
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    };
    const migration =
      new UpdateSaleOrdersAdvancedPermissionDescription20260828130000();

    await migration.up(queryRunner as never);
    const upSql = queries.join('\n');
    expect(upSql).toContain('insumos, tipo y almacén');
    expect(upSql).toContain("WHERE code = 'sale_orders.advanced_orders'");

    queries.length = 0;
    await migration.down(queryRunner as never);
    expect(queries.join('\n')).toContain('cantidades e insumos');
  });
});
