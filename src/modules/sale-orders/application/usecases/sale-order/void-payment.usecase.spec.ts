import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { VoidSaleOrderPaymentUsecase } from './void-payment.usecase';

describe('VoidSaleOrderPaymentUsecase', () => {
  const postedPayment = {
    id: 'payment-1',
    saleOrderId: 'order-1',
    amount: 150,
    status: 'REVERSED' as const,
    voidedAt: new Date('2026-10-05T10:00:00.000Z'),
    voidedByUserId: 'user-1',
    voidReason: 'Pago duplicado',
  };

  const make = (result: any = { payment: postedPayment, transitioned: true }) => {
    const paymentRepo = { voidPostedPayment: jest.fn().mockResolvedValue(result) };
    const uow = { runInTransaction: jest.fn((callback: (tx: unknown) => unknown) => callback({})) };
    return { paymentRepo, uow, usecase: new VoidSaleOrderPaymentUsecase(uow as any, paymentRepo as any) };
  };

  it('voids a posted payment and returns audit metadata', async () => {
    const { usecase, paymentRepo } = make();

    const result = await usecase.execute({
      saleOrderId: 'order-1',
      paymentId: 'payment-1',
      executedBy: 'user-1',
      reason: '  Pago duplicado  ',
    });

    expect(paymentRepo.voidPostedPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        saleOrderId: 'order-1',
        paymentId: 'payment-1',
        voidedByUserId: 'user-1',
        voidReason: 'Pago duplicado',
      }),
      expect.anything(),
    );
    expect(result).toEqual(expect.objectContaining({ type: 'success', message: 'Ingreso anulado correctamente' }));
  });

  it('rejects a missing or short reason', async () => {
    const { usecase } = make();
    await expect(usecase.execute({ saleOrderId: 'order-1', paymentId: 'payment-1', executedBy: 'user-1', reason: ' no ' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns not found when the payment does not belong to the order', async () => {
    const { usecase } = make(null);
    await expect(usecase.execute({ saleOrderId: 'order-1', paymentId: 'payment-1', executedBy: 'user-1', reason: 'Pago duplicado' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a conflict when another request already voided the payment', async () => {
    const { usecase } = make({ payment: { ...postedPayment, status: 'REVERSED', voidReason: 'Otro motivo' }, transitioned: false });
    await expect(usecase.execute({ saleOrderId: 'order-1', paymentId: 'payment-1', executedBy: 'user-2', reason: 'Pago duplicado' }))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
