import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PaymentsController } from 'src/modules/payments/adapters/in/controllers/payment.controller';
import { CreatePaymentUsecase } from 'src/modules/payments/application/usecases/payment/create.usecase';
import { DeletePaymentUsecase } from 'src/modules/payments/application/usecases/payment/delete.usecase';
import { GetPaymentUsecase } from 'src/modules/payments/application/usecases/payment/get-by-id.usecase';
import { GetPaymentsByPoIdUsecase } from 'src/modules/payments/application/usecases/payment/get-by-po-id.usecase';
import { ListPaymentsUsecase } from 'src/modules/payments/application/usecases/payment/list.usecase';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CompanyConfiguredGuard } from 'src/shared/utilidades/guards/company-configured.guard';
import { PermissionsGuard } from 'src/modules/access-control/adapters/in/guards/permissions.guard';

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
        { provide: DeletePaymentUsecase, useValue: { execute: jest.fn() } },
        { provide: GetPaymentUsecase, useValue: { execute: jest.fn() } },
        { provide: GetPaymentsByPoIdUsecase, useValue: { execute: jest.fn() } },
        { provide: ListPaymentsUsecase, useValue: listPaymentsUseCase },
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
    await app.close();
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

