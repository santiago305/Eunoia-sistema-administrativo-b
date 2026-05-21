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

  beforeEach(async () => {
    listPacks.execute.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });

    const moduleRef = await Test.createTestingModule({
      controllers: [PacksController],
      providers: [
        { provide: CreatePackUsecase, useValue: { execute: jest.fn() } },
        { provide: ListPacksUsecase, useValue: listPacks },
        { provide: GetPackUsecase, useValue: { execute: jest.fn() } },
        { provide: SetPackActiveUsecase, useValue: { execute: jest.fn() } },
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
});

