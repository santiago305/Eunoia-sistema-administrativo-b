import { SALE_ORDER_PERMISSIONS, SALE_ORDER_PERMISSION_CODES } from 'src/modules/sale-orders/application/constants/sale-order-permissions';
import { DEPRECATED_PERMISSION_CODES } from 'src/modules/access-control/infrastructure/seed/access-control.seeder';

describe('Sale orders permission contract (e2e)', () => {
  it('keeps a unique catalog of 37 page/action permissions', () => {
    expect(SALE_ORDER_PERMISSIONS).toHaveLength(37);
    expect(new Set(SALE_ORDER_PERMISSION_CODES).size).toBe(37);
    expect(SALE_ORDER_PERMISSION_CODES).toContain('page.sale-orders.view');
    expect(SALE_ORDER_PERMISSION_CODES).toContain('sale_orders.view_deleted');
    expect(SALE_ORDER_PERMISSION_CODES).not.toContain('sale_orders.preguide.update');
    expect(SALE_ORDER_PERMISSION_CODES).not.toContain('sale_orders.prepared.update');
  });

  it('retires direct tracking permissions and keeps restore gates', () => {
    const tracking = SALE_ORDER_PERMISSIONS.filter(({ code }) => code.includes('.preguide.') || code.includes('.prepared.'));
    expect(tracking).toEqual([]);
    expect(DEPRECATED_PERMISSION_CODES).toEqual(expect.arrayContaining([
      'sale_orders.preguide.update',
      'sale_orders.prepared.update',
    ]));
    expect(SALE_ORDER_PERMISSION_CODES).toEqual(expect.arrayContaining([
      'sale_orders.view_deleted',
      'sale_orders.restore',
    ]));
  });
});
