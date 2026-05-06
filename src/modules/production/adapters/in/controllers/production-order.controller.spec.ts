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

    const moduleRef = await Test.createTestingModule({
      controllers: [ProductionOrdersController],
      providers: [
        { provide: CreateProductionOrder, useValue: { execute: jest.fn() } },
        { provide: ListProductionOrders, useValue: listOrders },
        { provide: GetProductionOrder, useValue: { execute: jest.fn() } },
        { provide: UpdateProductionOrder, useValue: { execute: jest.fn() } },
        { provide: StartProductionOrder, useValue: { execute: jest.fn() } },
        { provide: CloseProductionOrder, useValue: { execute: jest.fn() } },
        { provide: CancelProductionOrder, useValue: { execute: jest.fn() } },
        { provide: AddProductionOrderItem, useValue: { execute: jest.fn() } },
        { provide: RemoveProductionOrderItem, useValue: { execute: jest.fn() } },
        { provide: UpdateProductionWaste, useValue: { execute: jest.fn() } },
        { provide: GetProductionOrderSearchStateUsecase, useValue: getSearchState },
        { provide: SaveProductionOrderSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: DeleteProductionOrderSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: PRODUCTION_ORDER_REPOSITORY, useValue: { findById: jest.fn(), update: jest.fn() } },
        { provide: ProductionOrderExpectedScheduler, useValue: { schedule: jest.fn() } },
        { provide: IMAGE_PROCESSOR, useValue: { toWebp: jest.fn() } },
        { provide: FILE_STORAGE, useValue: { save: jest.fn(), delete: jest.fn() } },
        { provide: ExportProductionOrdersExcelUsecase, useValue: { execute: jest.fn(), getAvailableColumns: jest.fn().mockReturnValue([]) } },
        { provide: LISTING_SEARCH_STORAGE, useValue: { listState: jest.fn().mockResolvedValue({ metrics: [] }), createMetric: jest.fn(), deleteMetric: jest.fn() } },
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
});
