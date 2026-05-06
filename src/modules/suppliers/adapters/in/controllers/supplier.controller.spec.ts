import "reflect-metadata";
import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateSupplierUsecase } from "src/modules/suppliers/application/usecases/supplier/create.usecase";
import { UpdateSupplierUsecase } from "src/modules/suppliers/application/usecases/supplier/update.usecase";
import { SetSupplierActiveUsecase } from "src/modules/suppliers/application/usecases/supplier/set-active.usecase";
import { ListSuppliersUsecase } from "src/modules/suppliers/application/usecases/supplier/list.usecase";
import { GetSupplierUsecase } from "src/modules/suppliers/application/usecases/supplier/get-by-id.usecase";
import { DeleteSupplierSearchMetricUsecase } from "src/modules/suppliers/application/usecases/supplier-search/delete-metric.usecase";
import { GetSupplierSearchStateUsecase } from "src/modules/suppliers/application/usecases/supplier-search/get-state.usecase";
import { SaveSupplierSearchMetricUsecase } from "src/modules/suppliers/application/usecases/supplier-search/save-metric.usecase";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";
import { SuppliersController } from "./supplier.controller";

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

describe("SuppliersController", () => {
  let app: INestApplication;
  const listSuppliers = { execute: jest.fn() };
  const getSearchState = { execute: jest.fn() };

  beforeEach(async () => {
    listSuppliers.execute.mockResolvedValue({ items: [], total: 0 });
    getSearchState.execute.mockResolvedValue({
      recent: [],
      metrics: [],
      catalogs: {
        documentTypes: [{ id: "RUC", label: "RUC" }],
        activeStates: [{ id: "true", label: "Activos" }],
      },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        { provide: CreateSupplierUsecase, useValue: { execute: jest.fn() } },
        { provide: UpdateSupplierUsecase, useValue: { execute: jest.fn() } },
        { provide: SetSupplierActiveUsecase, useValue: { execute: jest.fn() } },
        { provide: ListSuppliersUsecase, useValue: listSuppliers },
        { provide: GetSupplierUsecase, useValue: { execute: jest.fn() } },
        { provide: DeleteSupplierSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: GetSupplierSearchStateUsecase, useValue: getSearchState },
        { provide: SaveSupplierSearchMetricUsecase, useValue: { execute: jest.fn() } },
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

  it("returns search-state catalogs with activeStates", async () => {
    const response = await request(app.getHttpServer())
      .get("/suppliers/search-state")
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
      .get("/suppliers")
      .query({
        filters: JSON.stringify([
          { field: "documentType", operator: "in", values: [SupplierDocType.RUC] },
          { field: "isActive", operator: "in", values: ["true"] },
        ]),
      })
      .expect(200);

    expect(listSuppliers.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedBy: "user-1",
        filters: [
          { field: "documentType", operator: "in", mode: "include", values: [SupplierDocType.RUC] },
          { field: "isActive", operator: "in", mode: "include", values: ["true"] },
        ],
      }),
    );
  });
});
