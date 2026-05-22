import "reflect-metadata";
import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { ClientTelephonesController } from "./client-telephones.controller";
import { CreateTelephoneUsecase } from "src/modules/clients/application/usecases/telephone/create.usecase";
import { ListTelephonesByClientUsecase } from "src/modules/clients/application/usecases/telephone/list-by-client.usecase";
import { UpdateTelephoneUsecase } from "src/modules/clients/application/usecases/telephone/update.usecase";
import { SetTelephoneMainUsecase } from "src/modules/clients/application/usecases/telephone/set-main.usecase";

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

describe("ClientTelephonesController", () => {
  let app: INestApplication;
  const createTelephone = { execute: jest.fn() };

  beforeEach(async () => {
    createTelephone.execute.mockResolvedValue({ message: "ok" });

    const moduleRef = await Test.createTestingModule({
      controllers: [ClientTelephonesController],
      providers: [
        { provide: CreateTelephoneUsecase, useValue: createTelephone },
        { provide: ListTelephonesByClientUsecase, useValue: { execute: jest.fn() } },
        { provide: UpdateTelephoneUsecase, useValue: { execute: jest.fn() } },
        { provide: SetTelephoneMainUsecase, useValue: { execute: jest.fn() } },
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

  it("maps POST /clients/:clientId/telephones to usecase input", async () => {
    const clientId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

    await request(app.getHttpServer())
      .post(`/clients/${clientId}/telephones`)
      .send({ number: "999999999", isMain: true })
      .expect(201);

    expect(createTelephone.execute).toHaveBeenCalledWith({
      clientId,
      number: "999999999",
      isMain: true,
    });
  });
});
