import { SaleOrderStockCorrectionService } from './sale-order-stock-correction.service';

describe('SaleOrderStockCorrectionService', () => {
  const tx = { manager: {} } as any;
  const order = {
    id: 'order-1',
    warehouseId: 'warehouse-1',
    reserveBool: false,
  } as any;

  function fixture() {
    const requirements = {
      resolve: jest
        .fn()
        .mockResolvedValueOnce([{ stockItemId: 'stock-old', quantity: 1 }])
        .mockResolvedValueOnce([{ stockItemId: 'stock-new', quantity: 2 }]),
    };
    const consumptionReversal = {
      restoreAndReserve: jest.fn().mockResolvedValue(true),
    };
    const consumption = { consume: jest.fn().mockResolvedValue(undefined) };
    const saleOrderRepo = {
      setReserveBool: jest.fn(),
      markStockReverted: jest.fn(),
      findByIdForUpdate: jest.fn().mockResolvedValue(order),
    };
    const reservationReconciliation = {
      reconcile: jest.fn().mockResolvedValue({
        checked: true,
        adjusted: false,
        warehouseId: 'warehouse-1',
        items: [],
      }),
    };
    const service = new SaleOrderStockCorrectionService(
      requirements as any,
      consumptionReversal as any,
      consumption as any,
      saleOrderRepo as any,
      reservationReconciliation as any,
    );
    return {
      service,
      requirements,
      consumptionReversal,
      consumption,
      saleOrderRepo,
      reservationReconciliation,
    };
  }

  it('restores consumed stock, releases the old reservation and reserves the corrected composition', async () => {
    const f = fixture();

    await expect(
      f.service.releasePreviousComposition(order, 'CONSUMED', 'user-1', tx),
    ).resolves.toBe(true);
    await f.service.reserveCorrectedComposition(order, tx);

    expect(f.consumptionReversal.restoreAndReserve).toHaveBeenCalledWith(
      order,
      'user-1',
      tx,
    );
    expect(f.reservationReconciliation.reconcile).toHaveBeenNthCalledWith(
      1,
      order,
      [{ stockItemId: 'stock-old', quantity: 1 }],
      tx,
    );
    expect(f.reservationReconciliation.reconcile).toHaveBeenNthCalledWith(
      2,
      order,
      [{ stockItemId: 'stock-new', quantity: 2 }],
      tx,
    );
  });

  it('consumes the corrected reservation when the paid order remains final', async () => {
    const f = fixture();
    f.requirements.resolve
      .mockReset()
      .mockResolvedValue([{ stockItemId: 'stock-new', quantity: 2 }]);

    await f.service.consumeCorrectedSaleOrder('order-1', tx);

    expect(f.consumption.consume).toHaveBeenCalledWith(
      order,
      [{ stockItemId: 'stock-new', quantity: 2 }],
      tx,
    );
    expect(f.reservationReconciliation.reconcile).toHaveBeenCalledWith(
      order,
      [{ stockItemId: 'stock-new', quantity: 2 }],
      tx,
    );
    expect(f.saleOrderRepo.setReserveBool).toHaveBeenCalledWith(
      { saleOrderId: 'order-1', reserveBool: false },
      tx,
    );
  });

  it('releases the current reservation when payment rollback returns before RESERVE_STOCK', async () => {
    const f = fixture();
    const reservedOrder = { ...order, reserveBool: true };
    f.requirements.resolve
      .mockReset()
      .mockResolvedValue([{ stockItemId: 'stock-new', quantity: 2 }]);
    await f.service.releaseCurrentReservation(reservedOrder, tx);

    expect(f.reservationReconciliation.reconcile).toHaveBeenCalledWith(
      reservedOrder,
      [{ stockItemId: 'stock-new', quantity: 2 }],
      tx,
    );
    expect(f.saleOrderRepo.setReserveBool).toHaveBeenCalledWith(
      { saleOrderId: 'order-1', reserveBool: false },
      tx,
    );
  });
});
