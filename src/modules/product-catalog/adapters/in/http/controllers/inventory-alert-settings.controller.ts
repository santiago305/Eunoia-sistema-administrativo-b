import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from "@nestjs/common";
import { RequireAnyPermissionGroups } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import {
  GetInventoryAlertSettingUsecase,
  ListInventoryAlertSettingsUsecase,
  UpsertInventoryAlertSettingUsecase,
} from "src/modules/product-catalog/application/usecases/inventory-alert-settings.usecase";
import { ListInventoryAlertSettingsDto } from "../dtos/list-inventory-alert-settings.dto";
import { UpdateInventoryAlertSettingDto } from "../dtos/update-inventory-alert-setting.dto";
import { InventoryPredictiveAlertService } from "src/modules/product-catalog/application/services/inventory-predictive-alert.service";

@Controller("inventory-alert-settings")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class InventoryAlertSettingsController {
  constructor(
    private readonly listSettings: ListInventoryAlertSettingsUsecase,
    private readonly getSetting: GetInventoryAlertSettingUsecase,
    private readonly upsertSetting: UpsertInventoryAlertSettingUsecase,
    private readonly predictiveAlerts: InventoryPredictiveAlertService,
  ) {}

  @RequireAnyPermissionGroups(["inventory-alerts.configure"])
  @Get("policy/:productType")
  getPolicy(@Param("productType") productType: string) {
    return this.predictiveAlerts.getPolicy(productType);
  }

  @RequireAnyPermissionGroups(["inventory-alerts.configure"])
  @Patch("policy/:productType")
  updatePolicy(@Param("productType") productType: string, @Body() dto: UpdateInventoryAlertSettingDto) {
    return this.predictiveAlerts.updatePolicy(productType, dto);
  }

  @RequireAnyPermissionGroups(["inventory-alerts.configure"])
  @Get()
  list(@Query() query: ListInventoryAlertSettingsDto) {
    return this.listSettings.execute({
      stockItemId: query.stockItemId,
      warehouseId: query.warehouseId,
    });
  }

  @RequireAnyPermissionGroups(["inventory-alerts.configure"])
  @Get(":stockItemId")
  get(
    @Param("stockItemId", ParseUUIDPipe) stockItemId: string,
    @Query("warehouseId") warehouseId?: string,
  ) {
    return this.predictiveAlerts.evaluate(stockItemId, warehouseId);
  }

  @RequireAnyPermissionGroups(["inventory-alerts.configure"])
  @Patch(":stockItemId")
  update(
    @Param("stockItemId", ParseUUIDPipe) stockItemId: string,
    @Body() dto: UpdateInventoryAlertSettingDto,
  ) {
    return this.predictiveAlerts.evaluate(stockItemId, dto.warehouseId).then(({ policy }) =>
      this.predictiveAlerts.updatePolicy(policy.productType, {
        historyDays: dto.historyDays,
        coverageDays: dto.coverageDays ?? dto.alertThresholdDays,
        alertEnabled: dto.alertEnabled,
      }),
    );
  }
}
