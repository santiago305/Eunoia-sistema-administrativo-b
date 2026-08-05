import "reflect-metadata";
import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { PERMISSION_GROUPS_KEY } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import {
  GetInventoryAlertSettingUsecase,
  ListInventoryAlertSettingsUsecase,
  UpsertInventoryAlertSettingUsecase,
} from "src/modules/product-catalog/application/usecases/inventory-alert-settings.usecase";
import { InventoryAlertSettingsController } from "./inventory-alert-settings.controller";
import { InventoryPredictiveAlertService } from "src/modules/product-catalog/application/services/inventory-predictive-alert.service";

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

describe("InventoryAlertSettingsController", () => {
  let app: INestApplication;
  const listSettings = { execute: jest.fn() };
  const getSetting = { execute: jest.fn() };
  const upsertSetting = { execute: jest.fn() };
  const predictiveAlerts = { evaluate: jest.fn(), getPolicy: jest.fn(), updatePolicy: jest.fn() };

  const stockItemId = "11111111-1111-4111-8111-111111111111";
  const warehouseId = "22222222-2222-4222-8222-222222222222";

  beforeEach(async () => {
    listSettings.execute.mockResolvedValue([]);
    getSetting.execute.mockResolvedValue({
      id: null,
      stockItemId,
      warehouseId,
      minStockAlertQty: null,
      alertThresholdDays: 3,
      alertEnabled: true,
      isDefault: true,
    });
    upsertSetting.execute.mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      stockItemId,
      warehouseId,
      minStockAlertQty: 12,
      alertThresholdDays: 4,
      alertEnabled: true,
      isDefault: false,
    });
    predictiveAlerts.evaluate.mockResolvedValue({
      policy: { productType: "PRODUCT", historyDays: 3, coverageDays: 3, alertEnabled: true },
      stockItemId,
      warehouseId,
      history: [],
      averageDailyConsumption: 0,
      availableStock: 20,
      requiredStock: 0,
      coverageDays: null,
      shortage: 0,
      level: "NORMAL",
    });
    predictiveAlerts.updatePolicy.mockResolvedValue({ productType: "PRODUCT", historyDays: 3, coverageDays: 4, alertEnabled: true });

    const moduleRef = await Test.createTestingModule({
      controllers: [InventoryAlertSettingsController],
      providers: [
        { provide: ListInventoryAlertSettingsUsecase, useValue: listSettings },
        { provide: GetInventoryAlertSettingUsecase, useValue: getSetting },
        { provide: UpsertInventoryAlertSettingUsecase, useValue: upsertSetting },
        { provide: InventoryPredictiveAlertService, useValue: predictiveAlerts },
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

  it("protects all endpoints with inventory-alerts.configure", () => {
    const methods = ["list", "get", "update", "getPolicy", "updatePolicy"] as const;

    for (const method of methods) {
      expect(Reflect.getMetadata(PERMISSION_GROUPS_KEY, InventoryAlertSettingsController.prototype[method])).toEqual([
        ["inventory-alerts.configure"],
      ]);
    }
  });

  it("maps list query filters to the list usecase", async () => {
    await request(app.getHttpServer())
      .get("/inventory-alert-settings")
      .query({ stockItemId, warehouseId })
      .expect(200);

    expect(listSettings.execute).toHaveBeenCalledWith({ stockItemId, warehouseId });
  });

  it("maps effective setting lookup to the predictive evaluator", async () => {
    await request(app.getHttpServer())
      .get(`/inventory-alert-settings/${stockItemId}`)
      .query({ warehouseId })
      .expect(200);

    expect(predictiveAlerts.evaluate).toHaveBeenCalledWith(stockItemId, warehouseId);
  });

  it("updates the global product-type policy", async () => {
    await request(app.getHttpServer())
      .patch(`/inventory-alert-settings/${stockItemId}`)
      .send({
        warehouseId,
        historyDays: 3,
        coverageDays: 4,
        alertEnabled: true,
      })
      .expect(200);

    expect(predictiveAlerts.updatePolicy).toHaveBeenCalledWith("PRODUCT", {
      historyDays: 3,
      coverageDays: 4,
      alertEnabled: true,
    });
  });
});
