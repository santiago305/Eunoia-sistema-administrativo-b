import { BadRequestException, ConflictException } from '@nestjs/common';
import { SaleOrderPaymentReconcilerService } from './sale-order-payment-reconciler.service';

describe('SaleOrderPaymentReconcilerService', () => {
  const tx = { transaction: 'tx', manager: { query: jest.fn() } } as any;
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
    tx.manager.query.mockReset().mockImplementation((sql: string) => {
      if (sql.includes('SELECT currency')) return Promise.resolve([{ currency: 'PEN', companyId: 'company-1' }]);
      if (sql.includes('FROM company_payment_accounts')) {
        return Promise.resolve([{
          accountCurrency: 'PEN', accountUsage: 'INFLOW', accountIsActive: true,
          accountType: 'BANK_ACCOUNT', methodIsActive: true, methodCode: 'BANK_TRANSFER',
          requiresOperationNumber: false,
        }]);
      }
      return Promise.resolve([]);
    });
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
        executedBy: 'user-1',
        payments: [
          {
            id: 'payment-1',
            clientKey: 'persisted-1',
            date: new Date('2026-07-02T00:00:00.000Z'),
            method: 'YAPE',
            companyPaymentAccountId: 'account-1',
            paymentMethodId: 'method-1',
            amount: 80,
          },
          {
            clientKey: 'new-1',
            date: new Date('2026-07-03T00:00:00.000Z'),
            method: 'EFECTIVO',
            companyPaymentAccountId: 'account-1',
            paymentMethodId: 'method-1',
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
      [expect.objectContaining({
        saleOrderId: 'order-1', amount: 30, currency: 'PEN',
        companyPaymentAccountId: 'account-1', paymentMethodId: 'method-1',
      })],
      tx,
    );
    expect(result.paymentIdByClientKey.get('persisted-1')).toBe('payment-1');
    expect(result.paymentIdByClientKey.get('new-1')).toBe('payment-new');
    expect(result.retiredPaymentIds).toEqual([]);
    expect(tx.manager.query).toHaveBeenCalledTimes(7);
    expect(tx.manager.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO financial_outbox_events'),
      expect.arrayContaining(['income.payment_pending_created', 'payment-new']),
    );
  });

  it('rejects omitted pending payments instead of physically deleting financial history', async () => {
    const omitted = { ...existingPayment, id: 'payment-2' };
    const { service, paymentRepo } = createFixture([
      existingPayment,
      omitted,
    ]);

    await expect(service.reconcile(
      {
        saleOrderId: 'order-1',
        executedBy: 'user-1',
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
    )).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'FINANCIAL_HISTORY_IMMUTABLE' }),
    });

    expect(paymentRepo.deleteByIds).not.toHaveBeenCalled();
    expect(paymentRepo.bulkCreate).not.toHaveBeenCalled();
  });

  it('rejects a removed pending payment with a conflict response', async () => {
    const { service, paymentRepo } = createFixture();

    await expect(
      service.reconcile({ saleOrderId: 'order-1', executedBy: 'user-1', payments: [] }, tx),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(paymentRepo.deleteByIds).not.toHaveBeenCalled();
  });

  it('rejects payment IDs that do not belong to the order', async () => {
    const { service, paymentRepo } = createFixture();

    await expect(
      service.reconcile(
        {
          saleOrderId: 'order-1',
          executedBy: 'user-1',
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

  it('does not emit audit or outbox events for an unchanged pending payment', async () => {
    const { service, paymentRepo } = createFixture();

    await service.reconcile(
      {
        saleOrderId: 'order-1',
        executedBy: 'user-1',
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

    expect(paymentRepo.update).not.toHaveBeenCalled();
    expect(tx.manager.query).toHaveBeenCalledTimes(1);
  });

  it('rounds money to cents before creating a payment', async () => {
    const { service, paymentRepo } = createFixture([]);

    await service.reconcile(
      {
        saleOrderId: 'order-1',
        executedBy: 'user-1',
        payments: [
          {
            clientKey: 'new-1',
            date: new Date('2026-07-03T00:00:00.000Z'),
            method: 'EFECTIVO',
            companyPaymentAccountId: 'account-1',
            paymentMethodId: 'method-1',
            amount: 30.126,
          },
        ],
      },
      tx,
    );

    expect(paymentRepo.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ amount: 30.13 })],
      tx,
    );
  });

  it('rejects non-positive amounts before mutating persistence', async () => {
    const { service, paymentRepo } = createFixture([]);

    await expect(
      service.reconcile(
        {
          saleOrderId: 'order-1',
          executedBy: 'user-1',
          payments: [
            {
              clientKey: 'new-1',
              date: new Date('2026-07-03T00:00:00.000Z'),
              method: 'EFECTIVO',
              amount: 0,
            },
          ],
        },
        tx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(paymentRepo.update).not.toHaveBeenCalled();
    expect(paymentRepo.bulkCreate).not.toHaveBeenCalled();
    expect(tx.manager.query).toHaveBeenCalledTimes(1);
  });

  it('rejects an account type incompatible with the selected payment method', async () => {
    const { service, paymentRepo } = createFixture([]);
    tx.manager.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT currency')) return Promise.resolve([{ currency: 'PEN', companyId: 'company-1' }]);
      if (sql.includes('FROM company_payment_accounts')) {
        return Promise.resolve([{
          accountCurrency: 'PEN', accountUsage: 'INFLOW', accountIsActive: true,
          accountType: 'CASH', methodIsActive: true, methodCode: 'BANK_TRANSFER',
          requiresOperationNumber: false,
        }]);
      }
      return Promise.resolve([]);
    });

    await expect(
      service.reconcile(
        {
          saleOrderId: 'order-1',
          executedBy: 'user-1',
          payments: [{
            clientKey: 'new-1',
            date: new Date('2026-07-03T00:00:00.000Z'),
            method: 'TRANSFERENCIA',
            companyPaymentAccountId: 'cash-account',
            paymentMethodId: 'transfer-method',
            amount: 30,
          }],
        },
        tx,
      ),
    ).rejects.toThrow('no es compatible');

    expect(paymentRepo.bulkCreate).not.toHaveBeenCalled();
    expect(tx.manager.query).toHaveBeenCalledTimes(2);
  });

  it('requires the operation number when the company method is configured as required', async () => {
    const { service, paymentRepo } = createFixture([]);
    tx.manager.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT currency')) {
        return Promise.resolve([{ currency: 'PEN', companyId: 'company-1' }]);
      }
      if (sql.includes('FROM company_payment_accounts')) {
        return Promise.resolve([{
          accountCurrency: 'PEN', accountUsage: 'INFLOW', accountIsActive: true,
          accountType: 'BANK_ACCOUNT', methodIsActive: true, methodCode: 'BANK_TRANSFER',
          requiresOperationNumber: true,
        }]);
      }
      return Promise.resolve([]);
    });

    await expect(service.reconcile(
      {
        saleOrderId: 'order-1',
        executedBy: 'user-1',
        payments: [{
          clientKey: 'new-required-payment',
          date: new Date('2026-07-03T00:00:00.000Z'),
          method: 'TRANSFERENCIA',
          companyPaymentAccountId: 'account-1',
          paymentMethodId: 'method-1',
          amount: 30,
        }],
      },
      tx,
    )).rejects.toThrow('requiere un numero de operacion');

    expect(paymentRepo.bulkCreate).not.toHaveBeenCalled();
  });

  it('allows superadmins to use active payment accounts across companies while retaining regular-user scope', async () => {
    const { service } = createFixture([]);

    await service.reconcile(
      {
        saleOrderId: 'order-1',
        executedBy: 'superadmin-1',
        payments: [{
          clientKey: 'new-superadmin-payment',
          date: new Date('2026-07-03T00:00:00.000Z'),
          method: 'TRANSFERENCIA',
          companyPaymentAccountId: 'account-from-another-company',
          paymentMethodId: 'method-1',
          amount: 30,
        }],
      },
      tx,
    );

    const validationQuery = tx.manager.query.mock.calls.find(([sql]: [string]) =>
      sql.includes('FROM company_payment_accounts'),
    )?.[0] as string;

    expect(validationQuery).toContain('actor.is_super_admin = true');
    expect(validationQuery).toContain('actor.company_id = account.company_id');
    expect(validationQuery).toContain('account.company_id = $4');
    expect(validationQuery).toContain('actor.deleted = false');
    expect(validationQuery).toContain('JOIN company_methods configured');
    expect(validationQuery).toContain('configured.requires_operation_number');
  });
});
