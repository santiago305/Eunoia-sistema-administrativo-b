import { INestApplication, ExecutionContext } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { IncomeController } from "src/modules/income/adapters/in/controllers/income.controller";
import { GetIncomeEvidenceUsecase, UploadIncomeEvidenceUsecase } from "src/modules/income/application/usecases/get-income-evidence.usecase";
import { GetIncomeSummaryUsecase } from "src/modules/income/application/usecases/get-income-summary.usecase";
import { ListIncomeUsecase } from "src/modules/income/application/usecases/list-income.usecase";
import { FinancialOutboxPublisher } from "src/modules/income/infrastructure/financial-outbox-publisher.service";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { FILE_STORAGE } from "src/shared/application/ports/file-storage.port";

describe("Financial outbox operations authorization (e2e)", () => {
  let app: INestApplication;
  const permissionsByUser: Record<string, string[]> = {
    auditor: ["income.audit.view"],
    operator: ["income.audit.view", "income.outbox.manage"],
    ordinary: [],
  };
  const outbox = {
    getHealth: jest.fn().mockResolvedValue({ pending: 2, delayed: 1, deadLettered: 1, oldestPendingAt: "2026-10-12T10:00:00.000Z" }),
    listDeadLetters: jest.fn().mockResolvedValue([{ id: "event-1", attempts: 10, lastError: "socket down" }]),
    retryDeadLetter: jest.fn().mockResolvedValue({ id: "event-1", queued: true }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [IncomeController],
      providers: [
        { provide: ListIncomeUsecase, useValue: { execute: jest.fn() } },
        { provide: GetIncomeSummaryUsecase, useValue: { execute: jest.fn() } },
        { provide: GetIncomeEvidenceUsecase, useValue: { execute: jest.fn() } },
        { provide: UploadIncomeEvidenceUsecase, useValue: { execute: jest.fn() } },
        { provide: FILE_STORAGE, useValue: {} },
        { provide: FinancialOutboxPublisher, useValue: outbox },
        { provide: AccessControlService, useValue: { getEffectivePermissions: jest.fn(async (userId: string) => permissionsByUser[userId] ?? []) } },
        PermissionsGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const requestContext = context.switchToHttp().getRequest();
          requestContext.user = { id: requestContext.header("x-e2e-user") ?? "ordinary" };
          return true;
        },
      })
      .overrideGuard(CompanyConfiguredGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => app?.close());

  beforeEach(() => jest.clearAllMocks());

  it("requires audit permission for health and dead-letter inspection", async () => {
    await request(app.getHttpServer()).get("/income/outbox/health").set("x-e2e-user", "ordinary").expect(403);
    await request(app.getHttpServer()).get("/income/outbox/dead-letters?limit=20").set("x-e2e-user", "auditor").expect(200).expect((response) => {
      expect(response.body).toEqual([{ id: "event-1", attempts: 10, lastError: "socket down" }]);
      expect(response.body[0]).not.toHaveProperty("payload");
    });
    expect(outbox.listDeadLetters).toHaveBeenCalledWith(20);
  });

  it("requires the separate outbox-management permission for recovery and records the actor", async () => {
    await request(app.getHttpServer())
      .post("/income/outbox/11111111-1111-4111-8111-111111111111/retry")
      .set("x-e2e-user", "auditor")
      .expect(403);

    await request(app.getHttpServer())
      .post("/income/outbox/11111111-1111-4111-8111-111111111111/retry")
      .set("x-e2e-user", "operator")
      .expect(201)
      .expect({ id: "event-1", queued: true });
    expect(outbox.retryDeadLetter).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", "operator");
  });
});
