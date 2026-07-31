import { ConflictException } from '@nestjs/common';
import { SaleOrderDeactivationService } from './sale-order-deactivation.service';

describe('SaleOrderDeactivationService', () => {
  const order = (overrides: any = {}) => ({ id: 'so-1', isActive: true, reserveBool: false, ...overrides });

  it('archives an order after compensating reversible effects', async () => {
    const repo = { findByIdForUpdate: jest.fn().mockResolvedValue(order()), setActiveByIds: jest.fn().mockResolvedValue(['so-1']), createAudit: jest.fn() };
    const policy = { resolve: jest.fn().mockResolvedValue({ stockStatus: 'RESERVED' }) };
    const runner = { run: jest.fn().mockResolvedValue({}) };
    const logistics = { execute: jest.fn().mockResolvedValue(undefined) };
    await new SaleOrderDeactivationService(repo as any, policy as any, runner as any, logistics as any)
      .deactivate('so-1', 'u1', {} as any);
    expect(runner.run).toHaveBeenCalled();
    expect(logistics.execute).toHaveBeenCalled();
    expect(repo.setActiveByIds).toHaveBeenCalledWith({ saleOrderIds: ['so-1'], isActive: false }, {});
  });

  it('rejects an already archived order and consumed stock', async () => {
    const repo = { findByIdForUpdate: jest.fn().mockResolvedValue(order({ isActive: false })) };
    const service = new SaleOrderDeactivationService(repo as any, {} as any, {} as any, {} as any);
    await expect(service.deactivate('so-1', 'u1', {} as any)).rejects.toBeInstanceOf(ConflictException);
  });
});
