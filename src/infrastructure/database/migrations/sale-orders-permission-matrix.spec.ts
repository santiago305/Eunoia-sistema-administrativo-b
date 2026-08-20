import { databaseMigrations } from '../typeorm.config';
import { SALE_ORDER_PERMISSION_CODES } from '../../../modules/sale-orders/application/constants/sale-order-permissions';
import { AddSaleOrdersPermissionMatrix20260731130000 } from './20260731130000-add-sale-orders-permission-matrix';

const EXPECTED_SALE_ORDER_PERMISSION_CODES = [
  'page.sale-orders.view',
  'sale_orders.view',
  'sale_orders.view_all',
  'sale_orders.view_detail',
  'sale_orders.view_deleted',
  'sale_orders.view_statistics',
  'sale_orders.view_customer_data',
  'sale_orders.view_amounts',
  'sale_orders.products.view',
  'sale_orders.supplies.view',
  'sale_orders.stock.view',
  'sale_orders.create',
  'sale_orders.update',
  'sale_orders.delete',
  'sale_orders.restore',
  'sale_orders.clients.manage',
  'sale_orders.assign_adviser',
  'sale_orders.assign_workflow',
  'sale_orders.change_state',
  'sale_orders.execute_workflow_action',
  'sale_orders.cancel',
  'sale_orders.confirm_delivery',
  'sale_orders.view_history',
  'sale_orders.view_audit',
  'sale_orders.payments.view',
  'sale_orders.payments.create',
  'sale_orders.payments.update',
  'sale_orders.payments.delete',
  'sale_orders.attachments.view',
  'sale_orders.attachments.upload',
  'sale_orders.attachments.delete',
  'sale_orders.import',
  'sale_orders.import_lotes.view',
  'sale_orders.import_lotes.manage',
  'sale_orders.sku_recognition_codes.view',
  'sale_orders.sku_recognition_codes.manage',
  'sale_orders.export',
  'sale_orders.pdf.view',
  'sale_orders.workflows.view',
  'sale_orders.workflows.manage',
] as const;

describe('AddSaleOrdersPermissionMatrix20260731130000', () => {
  it('keeps the exact permission contract without duplicates', () => {
    expect(SALE_ORDER_PERMISSION_CODES).toEqual(
      EXPECTED_SALE_ORDER_PERMISSION_CODES,
    );
    expect(new Set(SALE_ORDER_PERMISSION_CODES).size).toBe(
      EXPECTED_SALE_ORDER_PERMISSION_CODES.length,
    );
  });

  it('is registered in the TypeORM migration list', () => {
    expect(databaseMigrations).toContain(
      AddSaleOrdersPermissionMatrix20260731130000,
    );
  });

  it('upserts the complete matrix and down removes only the new codes', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => queries.push(sql)),
    };
    const migration = new AddSaleOrdersPermissionMatrix20260731130000();

    await migration.up(queryRunner as never);
    const upSql = queries.join('\n');

    expect(upSql).toContain(
      'INSERT INTO permissions (code, name, description, module, resource, action, type, is_active)',
    );
    expect(upSql).toContain('ON CONFLICT (code) DO UPDATE SET');
    expect(upSql).toContain("('sale_orders.export'");
    expect(upSql).toContain("('sale_orders.preguide.update'");
    expect(upSql).toContain("('sale_orders.prepared.update'");
    expect(upSql).toContain(
      "'Cambiar estado de preguia', 'Marcar o desmarcar preguia individual o masivamente', 'sale_orders', 'sale_order_tracking', 'update'",
    );
    expect(upSql).toContain(
      "'Cambiar estado de preparacion', 'Marcar o desmarcar preparacion individual o masivamente', 'sale_orders', 'sale_order_tracking', 'update'",
    );
    expect(upSql).toContain('is_active = true');

    queries.length = 0;
    await migration.down(queryRunner as never);
    const downSql = queries.join('\n');

    expect(downSql).toContain('DELETE FROM permissions');
    expect(downSql).toContain('sale_orders.preguide.update');
    expect(downSql).toContain('sale_orders.prepared.update');
    expect(downSql).not.toContain('sale_orders.export');
  });
});
