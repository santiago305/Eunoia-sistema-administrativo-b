import { ConflictException } from '@nestjs/common';
import { AddSaleOrderPaymentUsecase } from './add-payment.usecase';

describe('AddSaleOrderPaymentUsecase', () => {
  it('retires the legacy payment endpoint instead of creating an untracked income', async () => {
    const usecase = new AddSaleOrderPaymentUsecase();

    await expect(
      usecase.execute({ saleOrderId: 'order-1', amount: 10 }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'FINANCIAL_ENDPOINT_RETIRED' }),
    });
  });

  it('returns a conflict rather than accepting any legacy payload', async () => {
    const usecase = new AddSaleOrderPaymentUsecase();

    await expect(usecase.execute({})).rejects.toBeInstanceOf(ConflictException);
  });
});
