import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AdminFinanceController } from 'src/modules/admin-finance/adapters/in/controllers/admin-finance.controller';
import { GetAdminFinanceSummaryUsecase } from 'src/modules/admin-finance/application/usecases/get-admin-finance-summary.usecase';
import { ListAdminFinanceMovementsUsecase } from 'src/modules/admin-finance/application/usecases/list-admin-finance-movements.usecase';
import { IncomeController } from 'src/modules/income/adapters/in/controllers/income.controller';
import { GetIncomeSummaryUsecase } from 'src/modules/income/application/usecases/get-income-summary.usecase';
import { ListIncomeUsecase } from 'src/modules/income/application/usecases/list-income.usecase';
import { PermissionsGuard } from 'src/modules/access-control/adapters/in/guards/permissions.guard';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CompanyConfiguredGuard } from 'src/shared/utilidades/guards/company-configured.guard';

describe('Administrative finance flow contracts (e2e)', () => {
  let app: INestApplication;
  let allowPermissions = true;

  const listIncome = { execute: jest.fn() };
  const getIncomeSummary = { execute: jest.fn() };
  const getAdminFinanceSummary = { execute: jest.fn() };
  const listAdminFinanceMovements = { execute: jest.fn() };

  beforeEach(async () => {
    allowPermissions = true;
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [IncomeController, AdminFinanceController],
      providers: [
        { provide: ListIncomeUsecase, useValue: listIncome },
        { provide: GetIncomeSummaryUsecase, useValue: getIncomeSummary },
        { provide: GetAdminFinanceSummaryUsecase, useValue: getAdminFinanceSummary },
        { provide: ListAdminFinanceMovementsUsecase, useValue: listAdminFinanceMovements },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CompanyConfiguredGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => allowPermissions })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('exposes sale order payments as income with collected and pending totals', async () => {
    listIncome.execute.mockResolvedValue({
      items: [
        {
          incomeId: 'sale-payment-1',
          saleOrderId: 'sale-order-1',
          clientName: 'Cliente Demo',
          amount: 120,
          method: 'Transferencia',
          companyPaymentAccountId: 'account-1',
          companyPaymentAccountLabel: 'BCP soles',
          operationNumber: 'OP-100',
          date: '2026-07-14T00:00:00.000Z',
          createdAt: '2026-07-14T00:01:00.000Z',
          evidenceUrl: '/storage/income/op-100.jpg',
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    });
    getIncomeSummary.execute.mockResolvedValue({
      totalCollected: 120,
      totalPending: 80,
      ordersPaid: 1,
      ordersPending: 1,
      byMethod: [{ method: 'Transferencia', amount: 120, count: 1 }],
      byAccount: [{ accountId: 'account-1', label: 'BCP soles', amount: 120, count: 1 }],
    });

    await request(app.getHttpServer())
      .get('/income?from=2026-07-01&to=2026-07-31')
      .expect(200)
      .expect((response) => {
        expect(response.body.items[0]).toEqual(
          expect.objectContaining({
            incomeId: 'sale-payment-1',
            saleOrderId: 'sale-order-1',
            amount: 120,
            evidenceUrl: '/storage/income/op-100.jpg',
          }),
        );
      });

    await request(app.getHttpServer())
      .get('/income/summary?from=2026-07-01&to=2026-07-31')
      .expect(200)
      .expect({
        totalCollected: 120,
        totalPending: 80,
        ordersPaid: 1,
        ordersPending: 1,
        byMethod: [{ method: 'Transferencia', amount: 120, count: 1 }],
        byAccount: [{ accountId: 'account-1', label: 'BCP soles', amount: 120, count: 1 }],
      });
  });

  it('exposes consolidated income, expense and logistics payable movements', async () => {
    getAdminFinanceSummary.execute.mockResolvedValue({
      income: { collected: 120, pending: 80 },
      expenses: { paid: 50, pending: 70, overdue: 20, scheduled: 30 },
      net: { collectedMinusPaid: 70, projectedAfterPending: 0 },
    });
    listAdminFinanceMovements.execute.mockResolvedValue({
      items: [
        {
          type: 'INCOME',
          source: 'SALE_ORDER',
          sourceId: 'sale-order-1',
          amount: 120,
          currency: 'PEN',
          status: 'APPROVED',
          date: '2026-07-14T00:00:00.000Z',
          description: 'Cobro pedido SO-1',
        },
        {
          type: 'EXPENSE',
          source: 'LOGISTICS',
          sourceId: 'account-payable-1',
          amount: 70,
          currency: 'PEN',
          status: 'PENDING',
          date: '2026-07-15T00:00:00.000Z',
          description: 'Envio pedido SO-1',
        },
      ],
      total: 2,
      page: 1,
      limit: 50,
    });

    await request(app.getHttpServer())
      .get('/admin-finance/summary?from=2026-07-01&to=2026-07-31')
      .expect(200)
      .expect({
        income: { collected: 120, pending: 80 },
        expenses: { paid: 50, pending: 70, overdue: 20, scheduled: 30 },
        net: { collectedMinusPaid: 70, projectedAfterPending: 0 },
      });

    await request(app.getHttpServer())
      .get('/admin-finance/movements?type=EXPENSE')
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toEqual([
          expect.objectContaining({ type: 'INCOME', source: 'SALE_ORDER', amount: 120 }),
          expect.objectContaining({ type: 'EXPENSE', source: 'LOGISTICS', amount: 70 }),
        ]);
      });
  });

  it('blocks administrative finance endpoints when permissions are denied', async () => {
    allowPermissions = false;

    await request(app.getHttpServer()).get('/income').expect(403);
    await request(app.getHttpServer()).get('/admin-finance/summary').expect(403);
    await request(app.getHttpServer()).get('/admin-finance/movements').expect(403);
  });
});
