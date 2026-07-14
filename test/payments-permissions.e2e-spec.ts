import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PaymentsController } from 'src/modules/payments/adapters/in/controllers/payment.controller';
import { ApprovePaymentUsecase } from 'src/modules/payments/application/usecases/payment/approve.usecase';
import { CreatePaymentUsecase } from 'src/modules/payments/application/usecases/payment/create.usecase';
import { DeletePaymentUsecase } from 'src/modules/payments/application/usecases/payment/delete.usecase';
import { ExportPaymentsExcelUsecase } from 'src/modules/payments/application/usecases/payment/export-excel.usecase';
import { GetPaymentUsecase } from 'src/modules/payments/application/usecases/payment/get-by-id.usecase';
import { GetPaymentsByPoIdUsecase } from 'src/modules/payments/application/usecases/payment/get-by-po-id.usecase';
import { ListPaymentsUsecase } from 'src/modules/payments/application/usecases/payment/list.usecase';
import { RejectPaymentUsecase } from 'src/modules/payments/application/usecases/payment/reject.usecase';
import { DeletePaymentSearchMetricUsecase } from 'src/modules/payments/application/usecases/payment-search/delete-metric.usecase';
import { GetPaymentSearchStateUsecase } from 'src/modules/payments/application/usecases/payment-search/get-state.usecase';
import { SavePaymentSearchMetricUsecase } from 'src/modules/payments/application/usecases/payment-search/save-metric.usecase';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CompanyConfiguredGuard } from 'src/shared/utilidades/guards/company-configured.guard';
import { PermissionsGuard } from 'src/modules/access-control/adapters/in/guards/permissions.guard';
import { AccessControlService } from 'src/modules/access-control/application/services/access-control.service';
import { NotificationsService } from 'src/modules/mail/application/use-cases/notifications.service';
import { LISTING_SEARCH_STORAGE } from 'src/shared/listing-search/domain/listing-search.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApprovalRequestEntity } from 'src/modules/purchases/adapters/out/persistence/typeorm/entities/approval-request.entity';
import { PurchaseHistoryEventEntity } from 'src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-history-event.entity';
import { PurchaseOrderEntity } from 'src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity';
import { RecalculateAccountPayableUsecase } from 'src/modules/accounts-payable';

describe('Payments permissions (e2e)', () => {
  let app: INestApplication;
  let allowPermissions = true;

  const listPaymentsUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    allowPermissions = true;
    listPaymentsUseCase.execute.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: CreatePaymentUsecase, useValue: { execute: jest.fn() } },
        { provide: ApprovePaymentUsecase, useValue: { execute: jest.fn() } },
        { provide: RejectPaymentUsecase, useValue: { execute: jest.fn() } },
        { provide: DeletePaymentUsecase, useValue: { execute: jest.fn() } },
        { provide: GetPaymentUsecase, useValue: { execute: jest.fn() } },
        { provide: GetPaymentsByPoIdUsecase, useValue: { execute: jest.fn() } },
        { provide: ListPaymentsUsecase, useValue: listPaymentsUseCase },
        { provide: ExportPaymentsExcelUsecase, useValue: { execute: jest.fn(), getAvailableColumns: jest.fn() } },
        { provide: GetPaymentSearchStateUsecase, useValue: { execute: jest.fn() } },
        { provide: SavePaymentSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: DeletePaymentSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: AccessControlService, useValue: { userHasAllPermissions: jest.fn(), getUserIdsWithPermission: jest.fn() } },
        { provide: NotificationsService, useValue: { createNotificationForUsers: jest.fn() } },
        { provide: LISTING_SEARCH_STORAGE, useValue: { listState: jest.fn(), createMetric: jest.fn(), deleteMetric: jest.fn() } },
        { provide: getRepositoryToken(ApprovalRequestEntity), useValue: { create: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(PurchaseHistoryEventEntity), useValue: { create: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(PurchaseOrderEntity), useValue: { findOne: jest.fn() } },
        { provide: RecalculateAccountPayableUsecase, useValue: { execute: jest.fn() } },
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

  it('GET /payments returns 403 when permissions guard denies access', async () => {
    allowPermissions = false;

    await request(app.getHttpServer())
      .get('/payments')
      .expect(403);
  });

  it('GET /payments returns 200 when permissions guard allows access', async () => {
    listPaymentsUseCase.execute.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await request(app.getHttpServer())
      .get('/payments')
      .expect(200)
      .expect({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });
  });
});

