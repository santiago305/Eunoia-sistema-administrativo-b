import "reflect-metadata";
import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateSaleOrderStateUseCase } from "../../../application/usecases/create-sale-order-state.usecase";
import { GetSaleOrderStateUseCase } from "../../../application/usecases/get-sale-order-state.usecase";
import { ListSaleOrderStatesUseCase } from "../../../application/usecases/list-sale-order-states.usecase";
import { UpdateSaleOrderStateUseCase } from "../../../application/usecases/update-sale-order-state.usecase";
import { SaleOrderStatesController } from "./sale-order-states.controller";

@Injectable()
class AllowGuard implements CanActivate {
  canActivate(_context: ExecutionContext) {
    return true;
  }
}

describe("SaleOrderStatesController", () => {
  let app: INestApplication;
  const createSaleOrderState = { execute: jest.fn().mockResolvedValue({ id: "state-1", name: "Creado", color: "#64748b" }) };
  const listSaleOrderStates = { execute: jest.fn().mockResolvedValue([{ id: "state-1", name: "Creado", color: "#64748b" }]) };
  const getSaleOrderState = { execute: jest.fn().mockResolvedValue({ id: "state-1", name: "Creado", color: "#64748b" }) };
  const updateSaleOrderState = { execute: jest.fn().mockResolvedValue({ id: "state-1", name: "Preparando", color: "#f97316" }) };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SaleOrderStatesController],
      providers: [
        { provide: CreateSaleOrderStateUseCase, useValue: createSaleOrderState },
        { provide: ListSaleOrderStatesUseCase, useValue: listSaleOrderStates },
        { provide: GetSaleOrderStateUseCase, useValue: getSaleOrderState },
        { provide: UpdateSaleOrderStateUseCase, useValue: updateSaleOrderState },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AllowGuard)
      .overrideGuard(CompanyConfiguredGuard)
      .useClass(AllowGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
    jest.clearAllMocks();
  });

  it("creates a sale order state", async () => {
    await request(app.getHttpServer())
      .post("/sale-order-states")
      .send({ code: "CREATED", name: "Creado", color: "#64748b" })
      .expect(201);

    expect(createSaleOrderState.execute).toHaveBeenCalledWith({
      code: "CREATED",
      name: "Creado",
      color: "#64748b",
    });
  });

  it("lists sale order states", async () => {
    await request(app.getHttpServer()).get("/sale-order-states").expect(200);

    expect(listSaleOrderStates.execute).toHaveBeenCalled();
  });

  it("gets a sale order state by id", async () => {
    const stateId = "11111111-1111-4111-8111-111111111111";

    await request(app.getHttpServer()).get(`/sale-order-states/${stateId}`).expect(200);

    expect(getSaleOrderState.execute).toHaveBeenCalledWith({ saleOrderStateId: stateId });
  });

  it("updates a sale order state", async () => {
    const stateId = "11111111-1111-4111-8111-111111111111";

    await request(app.getHttpServer())
      .patch(`/sale-order-states/${stateId}`)
      .send({ name: "Preparando", color: "#f97316" })
      .expect(200);

    expect(updateSaleOrderState.execute).toHaveBeenCalledWith({
      saleOrderStateId: stateId,
      name: "Preparando",
      color: "#f97316",
    });
  });
});
