import { SaleOrderReservationReconciliationService } from './sale-order-reservation-reconciliation.service';

describe('SaleOrderReservationReconciliationService', () => {
  const tx = { manager: {} } as any;
  const order = { id: 'order-1', warehouseId: 'warehouse-1' } as any;

  function fixture(input?: {
    expectedReserved?: number;
    onHand?: number;
    reserved?: number;
  }) {
    const expectedReserved = input?.expectedReserved ?? 5;
    const onHand = input?.onHand ?? 10;
    const reserved = input?.reserved ?? 2;
    const expectedTotals = {
      listExpected: jest.fn().mockResolvedValue([
        {
          stockItemId: 'stock-1',
          skuCode: 'SKU-1',
          productName: 'Producto uno',
          expectedReserved,
        },
      ]),
    };
    const inventoryRepo = {
      getSnapshot: jest.fn().mockResolvedValue({
        onHand,
        reserved,
        available: onHand - reserved,
      }),
      incrementReserved: jest.fn().mockResolvedValue(undefined),
    };
    const inventoryLock = { lockSnapshots: jest.fn() };
    const service = new SaleOrderReservationReconciliationService(
      expectedTotals as any,
      inventoryRepo as any,
      inventoryLock as any,
    );
    return { service, expectedTotals, inventoryRepo, inventoryLock };
  }

  it('completes only the missing reserved quantity', async () => {
    const f = fixture({ expectedReserved: 5, reserved: 2, onHand: 10 });

    await expect(
      f.service.reconcile(order, [{ stockItemId: 'stock-1', quantity: 2 }], tx),
    ).resolves.toEqual({
      checked: true,
      adjusted: true,
      warehouseId: 'warehouse-1',
      items: [
        expect.objectContaining({
          productName: 'Producto uno',
          orderQuantity: 2,
          previousReserved: 2,
          expectedReserved: 5,
          adjustment: 3,
          availableAfter: 5,
          status: 'COMPLETED',
        }),
      ],
    });
    expect(f.inventoryRepo.incrementReserved).toHaveBeenCalledWith(
      expect.objectContaining({ stockItemId: 'stock-1', delta: 3 }),
      tx,
    );
  });

  it('releases only the reservation excess', async () => {
    const f = fixture({ expectedReserved: 3, reserved: 5, onHand: 10 });

    const result = await f.service.reconcile(
      order,
      [{ stockItemId: 'stock-1', quantity: 2 }],
      tx,
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({ adjustment: -2, status: 'RELEASED_EXCESS' }),
    );
    expect(f.inventoryRepo.incrementReserved).toHaveBeenCalledWith(
      expect.objectContaining({ delta: -2 }),
      tx,
    );
  });

  it('reports an unchanged reservation without writing inventory', async () => {
    const f = fixture({ expectedReserved: 5, reserved: 5, onHand: 10 });

    const result = await f.service.reconcile(
      order,
      [{ stockItemId: 'stock-1', quantity: 2 }],
      tx,
    );

    expect(result).toEqual(
      expect.objectContaining({ checked: true, adjusted: false }),
    );
    expect(result.items[0].status).toBe('UNCHANGED');
    expect(f.inventoryRepo.incrementReserved).not.toHaveBeenCalled();
  });

  it('rejects the reconciliation when physical stock cannot cover all reservations', async () => {
    const f = fixture({ expectedReserved: 8, reserved: 4, onHand: 6 });

    await expect(
      f.service.reconcile(order, [{ stockItemId: 'stock-1', quantity: 2 }], tx),
    ).rejects.toThrow(
      'Stock insuficiente para completar la reserva de Producto uno (SKU-1)',
    );
    expect(f.inventoryRepo.incrementReserved).not.toHaveBeenCalled();
  });

  it('reports a complete reservation without changing inventory', async () => {
    const f = fixture({ expectedReserved: 5, reserved: 5, onHand: 10 });

    await expect(
      f.service.inspect(
        { ...order, reserveBool: true },
        [{ stockItemId: 'stock-1', quantity: 2 }],
        tx,
      ),
    ).resolves.toEqual(
      expect.objectContaining({ checked: true, status: 'COMPLETE' }),
    );
    expect(f.inventoryRepo.incrementReserved).not.toHaveBeenCalled();
  });

  it('reports an inconsistent reservation when the reserved aggregate differs', async () => {
    const f = fixture({ expectedReserved: 5, reserved: 2, onHand: 10 });

    const result = await f.service.inspect(
      { ...order, reserveBool: true },
      [{ stockItemId: 'stock-1', quantity: 2 }],
      tx,
    );

    expect(result.status).toBe('INCONSISTENT');
    expect(result.items[0]).toEqual(
      expect.objectContaining({ status: 'INCONSISTENT', difference: 3 }),
    );
  });

  it('reports insufficient stock when physical stock cannot rebuild the reservation', async () => {
    const f = fixture({ expectedReserved: 8, reserved: 4, onHand: 6 });

    const result = await f.service.inspect(
      { ...order, reserveBool: true },
      [{ stockItemId: 'stock-1', quantity: 2 }],
      tx,
    );

    expect(result.status).toBe('INSUFFICIENT_STOCK');
    expect(result.items[0]?.status).toBe('INSUFFICIENT_STOCK');
  });

  it('reports no reservation when the order is not marked as reserved', async () => {
    const f = fixture();

    await expect(
      f.service.inspect(
        { ...order, reserveBool: false },
        [{ stockItemId: 'stock-1', quantity: 2 }],
        tx,
      ),
    ).resolves.toEqual({
      checked: true,
      status: 'NO_RESERVATION',
      warehouseId: 'warehouse-1',
      items: [],
    });
    expect(f.expectedTotals.listExpected).not.toHaveBeenCalled();
  });
});
