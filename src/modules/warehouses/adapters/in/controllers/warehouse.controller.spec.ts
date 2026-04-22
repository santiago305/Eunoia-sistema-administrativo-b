import "reflect-metadata";
import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateWarehouseUsecase } from "src/modules/warehouses/application/usecases/warehouse/create.usecase";
import { GetWarehouseUsecase } from "src/modules/warehouses/application/usecases/warehouse/get-by-id.usecase";
import { GetWarehouseStockUsecase } from "src/modules/warehouses/application/usecases/warehouse/get-stock.usecase";
import { ListWarehousesUsecase } from "src/modules/warehouses/application/usecases/warehouse/list.usecase";
import { SetWarehouseActiveUsecase } from "src/modules/warehouses/application/usecases/warehouse/set-active.usecase";
import { UpdateWarehouseUsecase } from "src/modules/warehouses/application/usecases/warehouse/update.usecase";
import { GetWarehouseWithLocationsUsecase } from "src/modules/warehouses/application/usecases/warehouse/get-with-locations.usecase";
import { DeleteWarehouseSearchMetricUsecase } from "src/modules/warehouses/application/usecases/warehouse-search/delete-metric.usecase";
import { GetWarehouseSearchStateUsecase } from "src/modules/warehouses/application/usecases/warehouse-search/get-state.usecase";
import { SaveWarehouseSearchMetricUsecase } from "src/modules/warehouses/application/usecases/warehouse-search/save-metric.usecase";
import { WarehousesController } from "./warehouse.controller";

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

describe("WarehousesController", () => {
  let app: INestApplication;
  const listWarehouses = { execute: jest.fn() };
  const getSearchState = { execute: jest.fn() };

  beforeEach(async () => {
    listWarehouses.execute.mockResolvedValue({ items: [], total: 0 });
    getSearchState.execute.mockResolvedValue({
      recent: [],
      metrics: [],
      catalogs: {
        activeStates: [{ id: "true", label: "Activos" }],
        departments: [],
        provinces: [],
        districts: [],
      },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [WarehousesController],
      providers: [
        { provide: CreateWarehouseUsecase, useValue: { execute: jest.fn() } },
        { provide: UpdateWarehouseUsecase, useValue: { execute: jest.fn() } },
        { provide: SetWarehouseActiveUsecase, useValue: { execute: jest.fn() } },
        { provide: ListWarehousesUsecase, useValue: listWarehouses },
        { provide: GetWarehouseUsecase, useValue: { execute: jest.fn() } },
        { provide: GetWarehouseStockUsecase, useValue: { execute: jest.fn() } },
        { provide: GetWarehouseWithLocationsUsecase, useValue: { execute: jest.fn() } },
        { provide: GetWarehouseSearchStateUsecase, useValue: getSearchState },
        { provide: SaveWarehouseSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: DeleteWarehouseSearchMetricUsecase, useValue: { execute: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .overrideGuard(CompanyConfiguredGuard)
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

  it("returns search-state catalogs with activeStates", async () => {
    const response = await request(app.getHttpServer())
      .get("/warehouses/search-state")
      .expect(200);

    expect(response.body.catalogs).toEqual(
      expect.objectContaining({
        activeStates: [{ id: "true", label: "Activos" }],
      }),
    );
    expect(getSearchState.execute).toHaveBeenCalledWith("user-1");
  });

  it("parses smart-search filters and forwards them to the list usecase", async () => {
    await request(app.getHttpServer())
      .get("/warehouses")
      .query({
        filters: JSON.stringify([
          { field: "isActive", operator: "in", values: ["true"] },
          { field: "name", operator: "contains", value: "Central" },
        ]),
      })
      .expect(200);

    expect(listWarehouses.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedBy: "user-1",
        filters: [
          { field: "isActive", operator: "in", mode: "include", values: ["true"] },
          { field: "name", operator: "contains", value: "Central" },
        ],
      }),
    );
  });
});
