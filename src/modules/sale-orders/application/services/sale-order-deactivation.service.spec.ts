import { ConflictException } from '@nestjs/common';
import { SaleOrderDeactivationService } from './sale-order-deactivation.service';

describe('SaleOrderDeactivationService', () => {
  const order = (overrides: any = {}) => ({ id: 'so-1', isActive: true, reserveBool: false, ...overrides });

  it('archives an order after compensating reversible effects', async () => {
    const repo = { findByIdForUpdate: jest.fn().mockResolvedValue(order()), setActiveByIds: jest.fn().mockResolvedValue(['so-1']), createAudit: jest.fn() };
    const policy = { resolve: jest.fn().mockResolvedValue({ stockStatus: 'RESERVED' }) };
    const runner = { run: jest.fn().mockResolvedValue({}) };
    const stockReversal = {
      restoreAndRelease: jest.fn().mockResolvedValue(false),
      hasUnreversedConsumption: jest.fn().mockResolvedValue(false),
    };
    const logistics = { execute: jest.fn().mockResolvedValue(undefined) };
    await new SaleOrderDeactivationService(repo as any, policy as any, runner as any, stockReversal as any, logistics as any)
      .deactivate('so-1', 'u1', {} as any);
    expect(runner.run).toHaveBeenCalledWith(expect.anything(), expect.anything(), {}, 'u1');
    expect(logistics.execute).toHaveBeenCalled();
    expect(repo.setActiveByIds).toHaveBeenCalledWith({ saleOrderIds: ['so-1'], isActive: false }, {});
  });

  it('restores physically consumed stock before archiving an order', async () => {
    const consumedOrder = order({ warehouseId: 'warehouse-1' });
    const repo = {
      findByIdForUpdate: jest.fn().mockResolvedValue(consumedOrder),
      setActiveByIds: jest.fn().mockResolvedValue(['so-1']),
      createAudit: jest.fn(),
    };
    const policy = { resolve: jest.fn().mockResolvedValue({ stockStatus: 'CONSUMED' }) };
    const runner = { run: jest.fn() };
    const stockReversal = {
      restoreAndRelease: jest.fn().mockResolvedValue(true),
      hasUnreversedConsumption: jest.fn().mockResolvedValue(false),
    };
    const logistics = { execute: jest.fn().mockResolvedValue(undefined) };

    await new SaleOrderDeactivationService(repo as any, policy as any, runner as any, stockReversal as any, logistics as any)
      .deactivate('so-1', 'u1', {} as any);

    expect(stockReversal.restoreAndRelease).toHaveBeenCalledWith(consumedOrder, 'u1', {});
    expect(repo.setActiveByIds).toHaveBeenCalled();
  });

  it('does not archive while a physical consumption remains uncompensated', async () => {
    const repo = {
      findByIdForUpdate: jest.fn().mockResolvedValue(order({ warehouseId: 'warehouse-1' })),
      setActiveByIds: jest.fn(),
    };
    const stockReversal = {
      restoreAndRelease: jest.fn().mockResolvedValue(false),
      hasUnreversedConsumption: jest.fn().mockResolvedValue(true),
    };
    const service = new SaleOrderDeactivationService(
      repo as any,
      {} as any,
      {} as any,
      stockReversal as any,
      {} as any,
    );

    await expect(service.deactivate('so-1', 'u1', {} as any)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.setActiveByIds).not.toHaveBeenCalled();
  });

  it('rejects an already archived order and consumed stock', async () => {
    const repo = { findByIdForUpdate: jest.fn().mockResolvedValue(order({ isActive: false })) };
    const service = new SaleOrderDeactivationService(repo as any, {} as any, {} as any, {} as any, {} as any);
    await expect(service.deactivate('so-1', 'u1', {} as any)).rejects.toBeInstanceOf(ConflictException);
  });
});
