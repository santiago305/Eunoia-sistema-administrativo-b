import { SALE_ORDER_PERMISSIONS, SALE_ORDER_PERMISSION_CODES } from 'src/modules/sale-orders/application/constants/sale-order-permissions';

describe('Sale orders permission contract (e2e)', () => {
  it('keeps a unique catalog of 39 page/action permissions', () => {
    expect(SALE_ORDER_PERMISSIONS).toHaveLength(39);
    expect(new Set(SALE_ORDER_PERMISSION_CODES).size).toBe(39);
    expect(SALE_ORDER_PERMISSION_CODES).toContain('page.sale-orders.view');
    expect(SALE_ORDER_PERMISSION_CODES).toContain('sale_orders.view_deleted');
    expect(SALE_ORDER_PERMISSION_CODES).toContain('sale_orders.preguide.update');
    expect(SALE_ORDER_PERMISSION_CODES).toContain('sale_orders.prepared.update');
  });

  it('documents the independent tracking and restore gates', () => {
    const tracking = SALE_ORDER_PERMISSIONS.filter(({ code }) => code.includes('.preguide.') || code.includes('.prepared.'));
    expect(tracking.map(({ code }) => code)).toEqual([
      'sale_orders.preguide.update',
      'sale_orders.prepared.update',
    ]);
    expect(SALE_ORDER_PERMISSION_CODES).toEqual(expect.arrayContaining([
      'sale_orders.view_deleted',
      'sale_orders.restore',
    ]));
  });
});
