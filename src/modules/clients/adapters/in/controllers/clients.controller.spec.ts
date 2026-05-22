import "reflect-metadata";
import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { ClientsController } from "./clients.controller";
import { ListClientsUsecase } from "src/modules/clients/application/usecases/client/list.usecase";
import { CreateClientUsecase } from "src/modules/clients/application/usecases/client/create.usecase";
import { GetClientUsecase } from "src/modules/clients/application/usecases/client/get-by-id.usecase";
import { UpdateClientUsecase } from "src/modules/clients/application/usecases/client/update.usecase";
import { SetClientActiveUsecase } from "src/modules/clients/application/usecases/client/set-active.usecase";
import { GetClientSearchStateUsecase } from "src/modules/clients/application/usecases/client-search/get-state.usecase";
import { SaveClientSearchMetricUsecase } from "src/modules/clients/application/usecases/client-search/save-metric.usecase";
import { DeleteClientSearchMetricUsecase } from "src/modules/clients/application/usecases/client-search/delete-metric.usecase";

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

describe("ClientsController", () => {
  let app: INestApplication;
  const listClients = { execute: jest.fn() };
  const getSearchState = { execute: jest.fn() };

  beforeEach(async () => {
    listClients.execute.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
    getSearchState.execute.mockResolvedValue({
      recent: [],
      saved: [],
      catalogs: {
        activeStates: [{ id: "true", label: "Activos" }],
        docTypes: [{ id: "DNI", label: "DNI" }],
        clientTypes: [{ id: "NEW", label: "Nuevo" }],
        departments: [{ id: "15", label: "Lima" }],
        provinces: [{ id: "1501", label: "Lima" }],
        districts: [{ id: "150101", label: "Lima" }],
      },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        { provide: CreateClientUsecase, useValue: { execute: jest.fn() } },
        { provide: ListClientsUsecase, useValue: listClients },
        { provide: GetClientUsecase, useValue: { execute: jest.fn() } },
        { provide: UpdateClientUsecase, useValue: { execute: jest.fn() } },
        { provide: SetClientActiveUsecase, useValue: { execute: jest.fn() } },
        { provide: GetClientSearchStateUsecase, useValue: getSearchState },
        { provide: SaveClientSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: DeleteClientSearchMetricUsecase, useValue: { execute: jest.fn() } },
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

  it("parses query params and forwards to list usecase", async () => {
    await request(app.getHttpServer())
      .get("/clients")
      .query({ q: "Lima", isActive: "true", page: "2", limit: "20" })
      .expect(200);

    expect(listClients.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "Lima",
        isActive: true,
        page: 2,
        limit: 20,
        requestedBy: "user-1",
      }),
    );
  });

  it("returns search-state catalogs with activeStates", async () => {
    const response = await request(app.getHttpServer())
      .get("/clients/search-state")
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
      .get("/clients")
      .query({
        filters: JSON.stringify([
          { field: "isActive", operator: "in", values: ["true"] },
          { field: "fullName", operator: "contains", value: "juan" },
        ]),
      })
      .expect(200);

    expect(listClients.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedBy: "user-1",
        filters: [
          { field: "isActive", operator: "in", values: ["true"] },
          { field: "fullName", operator: "contains", value: "juan" },
        ],
      }),
    );
  });
});
