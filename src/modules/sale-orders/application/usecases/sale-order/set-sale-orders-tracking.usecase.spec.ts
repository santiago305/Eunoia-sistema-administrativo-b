import { BadRequestException, ConflictException } from '@nestjs/common';
import { SetSaleOrdersTrackingUsecase } from './set-sale-orders-tracking.usecase';

describe('SetSaleOrdersTrackingUsecase', () => {
  const make = (rows: any[] = [{ saleOrderId: 'o1', changedFields: ['preguide_on'] }]) => {
    const repo = { setTrackingByIds: jest.fn().mockResolvedValue(rows) };
    return { repo, usecase: new SetSaleOrdersTrackingUsecase(repo as any) };
  };

  it('rejects an empty command and duplicate ids', async () => {
    const { usecase } = make();
    await expect(usecase.execute({ saleOrderIds: ['o1'], executedBy: 'u' } as any))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(usecase.execute({ saleOrderIds: ['o1', 'o1'], preguide: true, executedBy: 'u' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns partial results and rejects inactive orders', async () => {
    const { usecase, repo } = make([{ saleOrderId: 'o1', changedFields: ['prepared_off'] }]);
    const result = await usecase.execute({ saleOrderIds: ['o1', 'o2'], prepared: false, executedBy: 'u' });
    expect(repo.setTrackingByIds).toHaveBeenCalledWith({ saleOrderIds: ['o1', 'o2'], preguide: undefined, prepared: false }, 'u', undefined);
    expect(result.data.succeeded).toBe(1);
    expect(result.data.failed).toBe(1);
    expect(() => usecase.assertActiveOrder({ isActive: false } as any)).toThrow(ConflictException);
  });
});
