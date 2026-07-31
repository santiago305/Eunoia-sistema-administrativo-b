import { ConflictException } from '@nestjs/common';
import { DeactivateLogisticsPayableForSaleOrderUsecase } from './deactivate-logistics-payable-for-sale-order.usecase';

describe('DeactivateLogisticsPayableForSaleOrderUsecase', () => {
  it('cancels a pending linked payable', async () => {
    const repo = {
      findActiveBySaleOrderId: jest.fn().mockResolvedValue({
        purchaseId: 'p', accountPayableId: 'a', amount: 20, amountPaid: 0,
      }),
      cancelPending: jest.fn().mockResolvedValue(undefined),
    };
    await new DeactivateLogisticsPayableForSaleOrderUsecase(repo as any).execute({ saleOrderId: 'so' });
    expect(repo.cancelPending).toHaveBeenCalledWith({ saleOrderId: 'so', purchaseId: 'p', accountPayableId: 'a' }, undefined);
  });

  it('blocks when the linked payable already has approved payments', async () => {
    const repo = { findActiveBySaleOrderId: jest.fn().mockResolvedValue({ purchaseId: 'p', accountPayableId: 'a', amount: 20, amountPaid: 1 }) };
    await expect(new DeactivateLogisticsPayableForSaleOrderUsecase(repo as any).execute({ saleOrderId: 'so' }))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
