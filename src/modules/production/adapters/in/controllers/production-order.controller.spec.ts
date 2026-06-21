import "reflect-metadata";
import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { FILE_STORAGE } from "src/shared/application/ports/file-storage.port";
import { IMAGE_PROCESSOR } from "src/shared/application/ports/image-processor.port";
import { ExportProductionOrdersExcelUsecase } from "src/modules/production/application/usecases/production-order/export-excel.usecase";
import { ProductionOrderExpectedScheduler } from "src/modules/production/application/jobs/production-order-expected-scheduler";
import { PRODUCTION_ORDER_REPOSITORY } from "src/modules/production/application/ports/production-order.repository";
import { LISTING_SEARCH_STORAGE } from "src/shared/listing-search/domain/listing-search.repository";
import request from "supertest";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateProductionOrder } from "src/modules/production/application/usecases/production-order/create.usecase";
import { ListProductionOrders } from "src/modules/production/application/usecases/production-order/list-orders.usecase";
import { GetProductionOrder } from "src/modules/production/application/usecases/production-order/get-record.usecase";
import { UpdateProductionOrder } from "src/modules/production/application/usecases/production-order/update-production-order.usecase";
import { StartProductionOrder } from "src/modules/production/application/usecases/production-order/start.usecase";
import { CloseProductionOrder } from "src/modules/production/application/usecases/production-order/close.usecase";
import { CancelProductionOrder } from "src/modules/production/application/usecases/production-order/cancel.usecase";
import { AddProductionOrderItem } from "src/modules/production/application/usecases/production-order/add-item.usecase";
import { RemoveProductionOrderItem } from "src/modules/production/application/usecases/production-order/remove-production-order-item.usecase";
import { UpdateProductionWaste } from "src/modules/production/application/usecases/production-order/update-waste.usecase";
import { DeleteProductionOrderSearchMetricUsecase } from "src/modules/production/application/usecases/production-search/delete-metric.usecase";
import { GetProductionOrderSearchStateUsecase } from "src/modules/production/application/usecases/production-search/get-state.usecase";
import { SaveProductionOrderSearchMetricUsecase } from "src/modules/production/application/usecases/production-search/save-metric.usecase";
import { ProductionOrdersController } from "./production-order.controller";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import { getEntityManagerToken, getRepositoryToken } from "@nestjs/typeorm";
import { ProductionHistoryEventEntity } from "../../out/persistence/typeorm/entities/production-history-event.entity";
import { ApprovalRequestEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/approval-request.entity";
import { NotificationsService } from "src/modules/mail/application/use-cases/notifications.service";

@Injectable()
class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = { id: "user-1" };
    return true;
  }
}

@Injectable()
class AllowGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

describe("ProductionOrdersController", () => {
  let app: INestApplication;
  const listOrders = { execute: jest.fn() };
  const getSearchState = { execute: jest.fn() };
  const cancelOrder = { execute: jest.fn() };
  const orderRepo = { findById: jest.fn(), update: jest.fn() };
  const accessControlService = { getEffectivePermissions: jest.fn() };

  beforeEach(async () => {
    listOrders.execute.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    getSearchState.execute.mockResolvedValue({
      recent: [],
      metrics: [],
      catalogs: {
        statuses: [],
        warehouses: [],
        products: [],
      },
    });
    cancelOrder.execute.mockResolvedValue({ message: "Orden cancelada con exito" });
    orderRepo.findById.mockResolvedValue(null);
    orderRepo.update.mockResolvedValue(null);
    accessControlService.getEffectivePermissions.mockResolvedValue(["*"]);

    const moduleRef = await Test.createTestingModule({
      controllers: [ProductionOrdersController],
      providers: [
        { provide: CreateProductionOrder, useValue: { execute: jest.fn() } },
        { provide: ListProductionOrders, useValue: listOrders },
        { provide: GetProductionOrder, useValue: { execute: jest.fn() } },
        { provide: UpdateProductionOrder, useValue: { execute: jest.fn() } },
        { provide: StartProductionOrder, useValue: { execute: jest.fn() } },
        { provide: CloseProductionOrder, useValue: { execute: jest.fn() } },
        { provide: CancelProductionOrder, useValue: cancelOrder },
        { provide: AddProductionOrderItem, useValue: { execute: jest.fn() } },
        { provide: RemoveProductionOrderItem, useValue: { execute: jest.fn() } },
        { provide: UpdateProductionWaste, useValue: { execute: jest.fn() } },
        { provide: GetProductionOrderSearchStateUsecase, useValue: getSearchState },
        { provide: SaveProductionOrderSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: DeleteProductionOrderSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: PRODUCTION_ORDER_REPOSITORY, useValue: orderRepo },
        { provide: ProductionOrderExpectedScheduler, useValue: { schedule: jest.fn() } },
        { provide: IMAGE_PROCESSOR, useValue: { toWebp: jest.fn() } },
        { provide: FILE_STORAGE, useValue: { save: jest.fn(), delete: jest.fn() } },
        { provide: ExportProductionOrdersExcelUsecase, useValue: { execute: jest.fn(), getAvailableColumns: jest.fn().mockReturnValue([]) } },
        { provide: LISTING_SEARCH_STORAGE, useValue: { listState: jest.fn().mockResolvedValue({ metrics: [] }), createMetric: jest.fn(), deleteMetric: jest.fn() } },
        { provide: getRepositoryToken(ProductionHistoryEventEntity), useValue: { create: jest.fn((value) => value), save: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(ApprovalRequestEntity), useValue: { create: jest.fn((value) => value), save: jest.fn(), find: jest.fn().mockResolvedValue([]), findOne: jest.fn() } },
        { provide: getEntityManagerToken(), useValue: { getRepository: jest.fn() } },
        { provide: AccessControlService, useValue: accessControlService },
        { provide: NotificationsService, useValue: { createNotificationForUsers: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .overrideGuard(CompanyConfiguredGuard)
      .useClass(AllowGuard)
      .overrideGuard(PermissionsGuard)
      .useClass(AllowGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
    jest.clearAllMocks();
  });

  it("returns search-state catalogs with warehouses", async () => {
    const response = await request(app.getHttpServer())
      .get("/production-orders/search-state")
      .expect(200);

    expect(response.body.catalogs).toEqual(
      expect.objectContaining({
        warehouses: expect.any(Array),
      }),
    );
    expect(getSearchState.execute).toHaveBeenCalledWith("user-1");
  });

  it("parses smart-search filters and forwards them to the list usecase", async () => {
    await request(app.getHttpServer())
      .get("/production-orders")
      .query({
        filters: JSON.stringify([
          { field: "skuId", operator: "in", values: ["sku-1"] },
          { field: "number", operator: "contains", value: "OP-001" },
        ]),
      })
      .expect(200);

    expect(listOrders.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedBy: "user-1",
        filters: [
          { field: "skuId", operator: "in", values: ["sku-1"] },
          { field: "number", operator: "contains", value: "OP-001" },
        ],
      }),
    );
  });

  it("rejects cancelling a draft production order without production.cancel_draft", async () => {
    orderRepo.findById.mockResolvedValue({
      productionId: "11111111-1111-4111-8111-111111111111",
      status: ProductionStatus.DRAFT,
    });
    accessControlService.getEffectivePermissions.mockResolvedValue(["production.cancel"]);

    await request(app.getHttpServer())
      .post("/production-orders/11111111-1111-4111-8111-111111111111/cancel")
      .expect(403);

    expect(cancelOrder.execute).not.toHaveBeenCalled();
  });

  it("allows cancelling an in-progress production order with production.cancel_in_progress", async () => {
    orderRepo.findById.mockResolvedValue({
      productionId: "22222222-2222-4222-8222-222222222222",
      status: ProductionStatus.IN_PROGRESS,
    });
    accessControlService.getEffectivePermissions.mockResolvedValue([
      "production.cancel",
      "production.cancel_in_progress",
    ]);

    await request(app.getHttpServer())
      .post("/production-orders/22222222-2222-4222-8222-222222222222/cancel")
      .expect(201);

    expect(cancelOrder.execute).toHaveBeenCalledWith(
      { productionId: "22222222-2222-4222-8222-222222222222" },
      "user-1",
    );
  });

  it("rejects reverting a completed production order without production.delete_completed", async () => {
    orderRepo.findById.mockResolvedValue({
      productionId: "33333333-3333-4333-8333-333333333333",
      status: ProductionStatus.COMPLETED,
    });
    accessControlService.getEffectivePermissions.mockResolvedValue([
      "production.cancel",
      "production.cancel_in_progress",
    ]);

    await request(app.getHttpServer())
      .post("/production-orders/33333333-3333-4333-8333-333333333333/cancel")
      .expect(403);

    expect(cancelOrder.execute).not.toHaveBeenCalled();
  });
});
