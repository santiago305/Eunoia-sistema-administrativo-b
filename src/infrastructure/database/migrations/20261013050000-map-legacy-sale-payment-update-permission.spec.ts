import { databaseMigrations } from '../typeorm.config';
import { MapLegacySalePaymentUpdatePermission20261013050000 } from './20261013050000-map-legacy-sale-payment-update-permission';

describe('MapLegacySalePaymentUpdatePermission20261013050000', () => {
  it('registers a forward-only, idempotent mapping for role and user grants', async () => {
    expect(databaseMigrations).toContain(MapLegacySalePaymentUpdatePermission20261013050000);
    const runner = { query: jest.fn() };

    await new MapLegacySalePaymentUpdatePermission20261013050000().up(runner as never);

    expect(runner.query).toHaveBeenCalledTimes(1);
    const sql = runner.query.mock.calls[0][0] as string;
    expect(sql).toContain("legacy.code = 'sale_orders.payments.update'");
    expect(sql).toContain("replacement.code = 'sale_orders.payments.update_pending'");
    expect(sql).toContain('INSERT INTO role_permissions');
    expect(sql).toContain('INSERT INTO user_permission_overrides');
    expect(sql).toContain('INSERT INTO user_grantable_permissions');
    expect(sql).toContain('WHERE NOT EXISTS');
    expect(sql).toContain('DELETE FROM permissions');
    expect(sql).toContain("'sale_orders.payments.delete'");
    expect(sql).toContain("'sale_orders.payments.void'");
  });

  it('does not roll back grants that may have been independently assigned', async () => {
    const runner = { query: jest.fn() };
    await new MapLegacySalePaymentUpdatePermission20261013050000().down();
    expect(runner.query).not.toHaveBeenCalled();
  });
});
