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
    const inventoryRepo = {
      getSnapshot: jest.fn().mockImplementation(({ stockItemId }) =>
        Promise.resolve(
          stockItemId === 'stock-old'
            ? { onHand: 5, reserved: 1, available: 4 }
            : { onHand: 5, reserved: 0, available: 5 },
        ),
      ),
      incrementReserved: jest.fn().mockResolvedValue(undefined),
    };
    const inventoryLock = { lockSnapshots: jest.fn() };
    const saleOrderRepo = {
      setReserveBool: jest.fn(),
      markStockReverted: jest.fn(),
      findByIdForUpdate: jest.fn().mockResolvedValue(order),
    };
    const service = new SaleOrderStockCorrectionService(
      requirements as any,
      consumptionReversal as any,
      consumption as any,
      inventoryRepo as any,
      inventoryLock as any,
      saleOrderRepo as any,
    );
    return {
      service,
      requirements,
      consumptionReversal,
      consumption,
      inventoryRepo,
      saleOrderRepo,
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
    expect(f.inventoryRepo.incrementReserved).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ stockItemId: 'stock-old', delta: -1 }),
      tx,
    );
    expect(f.inventoryRepo.incrementReserved).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ stockItemId: 'stock-new', delta: 2 }),
      tx,
    );
  });

  it('consumes the corrected reservation when the paid order remains final', async () => {
    const f = fixture();
    f.requirements.resolve.mockReset().mockResolvedValue([
      { stockItemId: 'stock-new', quantity: 2 },
    ]);

    await f.service.consumeCorrectedSaleOrder('order-1', tx);

    expect(f.consumption.consume).toHaveBeenCalledWith(
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
    f.requirements.resolve.mockReset().mockResolvedValue([
      { stockItemId: 'stock-new', quantity: 2 },
    ]);
    f.inventoryRepo.getSnapshot.mockResolvedValue({
      onHand: 5,
      reserved: 2,
      available: 3,
    });

    await f.service.releaseCurrentReservation(reservedOrder, tx);

    expect(f.inventoryRepo.incrementReserved).toHaveBeenCalledWith(
      expect.objectContaining({ stockItemId: 'stock-new', delta: -2 }),
      tx,
    );
    expect(f.saleOrderRepo.setReserveBool).toHaveBeenCalledWith(
      { saleOrderId: 'order-1', reserveBool: false },
      tx,
    );
  });
});
