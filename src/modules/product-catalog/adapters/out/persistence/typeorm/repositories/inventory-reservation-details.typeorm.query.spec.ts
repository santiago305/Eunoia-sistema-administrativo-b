import { ProductCatalogProductType } from 'src/modules/product-catalog/domain/value-objects/product-type';
import { InventoryReservationDetailsTypeormQuery } from './inventory-reservation-details.typeorm.query';

describe('InventoryReservationDetailsTypeormQuery', () => {
  const getRawOne = jest.fn();
  const andWhere = jest.fn().mockReturnThis();
  const where = jest.fn().mockReturnThis();
  const select = jest.fn().mockReturnThis();
  const createQueryBuilder = jest.fn(() => ({
    select,
    where,
    andWhere,
    getRawOne,
  }));
  const rawQuery = jest.fn();
  const repository = {
    createQueryBuilder,
    manager: { query: rawQuery },
  };
  const query = new InventoryReservationDetailsTypeormQuery(repository as any);

  beforeEach(() => {
    jest.clearAllMocks();
    select.mockReturnThis();
    where.mockReturnThis();
    andWhere.mockReturnThis();
    getRawOne.mockResolvedValue({ reserved: '5' });
  });

  it('attributes product reservations to active sale orders', async () => {
    rawQuery.mockResolvedValueOnce([
      {
        sourceType: 'SALE_ORDER',
        sourceId: 'order-1',
        documentNumber: 'PV-101',
        subjectName: 'Cliente Uno',
        statusCode: 'SCHEDULED',
        statusName: 'Programado',
        plannedDate: '2026-08-30',
        createdAt: new Date('2026-08-27T10:00:00Z'),
        quantity: '5',
      },
    ]);

    const result = await query.list({
      stockItemId: 'stock-1',
      warehouseId: 'warehouse-1',
      productType: ProductCatalogProductType.PRODUCT,
    });

    expect(rawQuery.mock.calls[0][0]).toContain('sale_order_item_components');
    expect(rawQuery.mock.calls[0][1]).toEqual(['warehouse-1', 'stock-1']);
    expect(result).toMatchObject({
      inventoryReserved: 5,
      attributedReserved: 5,
      difference: 0,
      items: [{ sourceId: 'order-1', quantity: 5 }],
    });
  });

  it('uses supply lines when the inventory item is a supply', async () => {
    rawQuery.mockResolvedValueOnce([]);

    await query.list({
      stockItemId: 'supply-1',
      warehouseId: 'warehouse-1',
      productType: ProductCatalogProductType.SUPPLY,
    });

    expect(rawQuery.mock.calls[0][0]).toContain('sale_order_supply_items');
  });

  it('attributes material reservations to active production orders', async () => {
    getRawOne.mockResolvedValueOnce({ reserved: '4' });
    rawQuery.mockResolvedValueOnce([
      {
        sourceType: 'PRODUCTION_ORDER',
        sourceId: 'production-1',
        documentNumber: 'OP-20',
        subjectName: 'Lote agosto',
        statusCode: 'IN_PROGRESS',
        statusName: 'En progreso',
        plannedDate: new Date('2026-08-29T10:00:00Z'),
        createdAt: new Date('2026-08-27T10:00:00Z'),
        quantity: '3',
      },
    ]);

    const result = await query.list({
      stockItemId: 'material-1',
      warehouseId: 'warehouse-1',
      productType: ProductCatalogProductType.MATERIAL,
    });

    expect(rawQuery.mock.calls[0][0]).toContain('production_orders');
    expect(rawQuery.mock.calls[0][0]).toContain("'IN_PROGRESS', 'PARTIAL'");
    expect(result.difference).toBe(1);
    expect(result.items[0]).toMatchObject({
      sourceType: 'PRODUCTION_ORDER',
      quantity: 3,
    });
  });
});
