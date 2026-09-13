import { SaleOrderReservationTotalsTypeormQuery } from './sale-order-reservation-totals.typeorm.query';

describe('SaleOrderReservationTotalsTypeormQuery', () => {
  it('combines sale items, supplies and production reservations', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        stockItemId: 'stock-1',
        skuCode: 'SKU-1',
        productName: 'Producto uno',
        expectedReserved: '4',
      },
    ]);
    const repository = { manager: { query } };
    const adapter = new SaleOrderReservationTotalsTypeormQuery(
      repository as any,
    );

    await expect(
      adapter.listExpected({
        warehouseId: 'warehouse-1',
        stockItemIds: ['stock-1', 'stock-1'],
      }),
    ).resolves.toEqual([
      {
        stockItemId: 'stock-1',
        skuCode: 'SKU-1',
        productName: 'Producto uno',
        expectedReserved: 4,
      },
    ]);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('sale_order_item_components');
    expect(sql).toContain('sale_order_supply_items');
    expect(sql).toContain('production_orders');
    expect(sql).toContain('sale_order.reserve_bool = TRUE');
    expect(params).toEqual(['warehouse-1', ['stock-1']]);
  });
});
