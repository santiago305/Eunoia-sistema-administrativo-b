import { BadRequestException } from '@nestjs/common';
import { SaleOrderPaymentReconcilerService } from './sale-order-payment-reconciler.service';

describe('SaleOrderPaymentReconcilerService', () => {
  const tx = { transaction: 'tx' } as any;
  const existingPayment = {
    id: 'payment-1',
    saleOrderId: 'order-1',
    bankAccountId: null,
    date: new Date('2026-07-01T00:00:00.000Z'),
    method: 'EFECTIVO',
    operationNumber: null,
    amount: 50,
    note: null,
    paymentPhoto: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
  };

  function createFixture(existing = [existingPayment]) {
    const paymentRepo = {
      listBySaleOrderId: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockResolvedValue(undefined),
      deleteByIds: jest.fn().mockResolvedValue(undefined),
      bulkCreate: jest.fn().mockResolvedValue([
        { ...existingPayment, id: 'payment-new', amount: 30 },
      ]),
    };
    return {
      paymentRepo,
      service: new SaleOrderPaymentReconcilerService(paymentRepo as any),
    };
  }

  it('updates retained payments, inserts new ones and maps their client keys', async () => {
    const { service, paymentRepo } = createFixture();

    const result = await service.reconcile(
      {
        saleOrderId: 'order-1',
        payments: [
          {
            id: 'payment-1',
            clientKey: 'persisted-1',
            date: new Date('2026-07-02T00:00:00.000Z'),
            method: 'YAPE',
            amount: 80,
          },
          {
            clientKey: 'new-1',
            date: new Date('2026-07-03T00:00:00.000Z'),
            method: 'EFECTIVO',
            amount: 30,
          },
        ],
      },
      tx,
    );

    expect(paymentRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        saleOrderId: 'order-1',
        paymentId: 'payment-1',
        amount: 80,
      }),
      tx,
    );
    expect(paymentRepo.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ saleOrderId: 'order-1', amount: 30 })],
      tx,
    );
    expect(result.paymentIdByClientKey.get('persisted-1')).toBe('payment-1');
    expect(result.paymentIdByClientKey.get('new-1')).toBe('payment-new');
    expect(result.retiredPaymentIds).toEqual([]);
  });

  it('deletes omitted payments and reports their IDs for attachment retirement', async () => {
    const omitted = { ...existingPayment, id: 'payment-2' };
    const { service, paymentRepo } = createFixture([
      existingPayment,
      omitted,
    ]);

    const result = await service.reconcile(
      {
        saleOrderId: 'order-1',
        payments: [
          {
            id: 'payment-1',
            clientKey: 'persisted-1',
            date: existingPayment.date,
            method: existingPayment.method,
            amount: existingPayment.amount,
          },
        ],
      },
      tx,
    );

    expect(paymentRepo.deleteByIds).toHaveBeenCalledWith(
      { saleOrderId: 'order-1', paymentIds: ['payment-2'] },
      tx,
    );
    expect(result.retiredPaymentIds).toEqual(['payment-2']);
  });

  it('rejects payment IDs that do not belong to the order', async () => {
    const { service, paymentRepo } = createFixture();

    await expect(
      service.reconcile(
        {
          saleOrderId: 'order-1',
          payments: [
            {
              id: 'foreign-payment',
              clientKey: 'foreign',
              date: existingPayment.date,
              method: 'EFECTIVO',
              amount: 10,
            },
          ],
        },
        tx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(paymentRepo.update).not.toHaveBeenCalled();
    expect(paymentRepo.deleteByIds).not.toHaveBeenCalled();
    expect(paymentRepo.bulkCreate).not.toHaveBeenCalled();
  });
});
