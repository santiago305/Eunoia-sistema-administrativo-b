import "reflect-metadata";
import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { PacksController } from "./packs.controller";
import { CreatePackUsecase } from "src/modules/packs/application/usecases/pack/create.usecase";
import { ListPacksUsecase } from "src/modules/packs/application/usecases/pack/list.usecase";
import { GetPackUsecase } from "src/modules/packs/application/usecases/pack/get-by-id.usecase";
import { SetPackActiveUsecase } from "src/modules/packs/application/usecases/pack/set-active.usecase";
import { GetPackSearchStateUsecase } from "src/modules/packs/application/usecases/pack-search/get-state.usecase";
import { SavePackSearchMetricUsecase } from "src/modules/packs/application/usecases/pack-search/save-metric.usecase";
import { DeletePackSearchMetricUsecase } from "src/modules/packs/application/usecases/pack-search/delete-metric.usecase";
import { UpdatePackUsecase } from "src/modules/packs/application/usecases/pack/update.usecase";

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

describe("PacksController", () => {
  let app: INestApplication;
  const listPacks = { execute: jest.fn() };
  const getSearchState = { execute: jest.fn() };
  const updatePack = { execute: jest.fn() };

  beforeEach(async () => {
    listPacks.execute.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
    getSearchState.execute.mockResolvedValue({
      recent: [],
      saved: [],
      catalogs: {
        activeStates: [{ id: "true", label: "Activos" }],
      },
    });
    updatePack.execute.mockResolvedValue({ message: "Pack actualizado con exito" });

    const moduleRef = await Test.createTestingModule({
      controllers: [PacksController],
      providers: [
        { provide: CreatePackUsecase, useValue: { execute: jest.fn() } },
        { provide: ListPacksUsecase, useValue: listPacks },
        { provide: GetPackUsecase, useValue: { execute: jest.fn() } },
        { provide: SetPackActiveUsecase, useValue: { execute: jest.fn() } },
        { provide: GetPackSearchStateUsecase, useValue: getSearchState },
        { provide: SavePackSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: DeletePackSearchMetricUsecase, useValue: { execute: jest.fn() } },
        { provide: UpdatePackUsecase, useValue: updatePack },
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

  it("parses q/isActive/page/limit and forwards to list usecase", async () => {
    await request(app.getHttpServer())
      .get("/packs")
      .query({ q: "100", isActive: "false", page: "2", limit: "20" })
      .expect(200);

    expect(listPacks.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "100",
        isActive: false,
        page: 2,
        limit: 20,
      }),
    );
  });

  it("returns search-state catalogs with activeStates", async () => {
    const response = await request(app.getHttpServer())
      .get("/packs/search-state")
      .expect(200);

    expect(response.body.catalogs).toEqual(
      expect.objectContaining({
        activeStates: [{ id: "true", label: "Activos" }],
      }),
    );
  });

  it("parses smart-search filters and forwards them to the list usecase", async () => {
    await request(app.getHttpServer())
      .get("/packs")
      .query({
        filters: JSON.stringify([
          { field: "isActive", operator: "in", values: ["true"] },
          { field: "skuText", operator: "contains", value: "leche" },
        ]),
      })
      .expect(200);

    expect(listPacks.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedBy: "user-1",
        filters: [
          { field: "isActive", operator: "in", values: ["true"] },
          { field: "skuText", operator: "contains", value: "leche" },
        ],
      }),
    );
  });

  it("forwards q to list usecase (enables smart-search semantics server-side)", async () => {
    await request(app.getHttpServer())
      .get("/packs")
      .query({ q: "activo" })
      .expect(200);

    expect(listPacks.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "activo",
      }),
    );
  });

  it("updates pack with itemsReplace and forwards payload", async () => {
    const packId = "11111111-1111-4111-8111-111111111111";
    const itemId = "22222222-2222-4222-8222-222222222222";
    const skuId = "33333333-3333-4333-8333-333333333333";

    const payload = {
      description: "Pack editado",
      total: 10,
      itemsReplace: [
        { id: itemId, skuId, quantity: 1, price: 10 },
      ],
    };

    await request(app.getHttpServer())
      .patch(`/packs/${packId}`)
      .send(payload)
      .expect(200);

    expect(updatePack.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        packId,
        description: "Pack editado",
        total: 10,
        itemsReplace: payload.itemsReplace,
      }),
    );
  });
});
