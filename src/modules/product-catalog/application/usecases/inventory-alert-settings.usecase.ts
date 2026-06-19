import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  InventoryAlertSetting,
  InventoryAlertSettingListInput,
  InventoryAlertSettingLookupInput,
  InventoryAlertSettingRepository,
  InventoryAlertSettingUpsertInput,
  PRODUCT_CATALOG_INVENTORY_ALERT_SETTING_REPOSITORY,
} from "../../domain/ports/inventory-alert-setting.repository";

export interface InventoryAlertSettingOutput {
  id: string | null;
  stockItemId: string;
  warehouseId: string | null;
  minStockAlertQty: number | null;
  alertThresholdDays: number;
  alertEnabled: boolean;
  isDefault: boolean;
}

const DEFAULT_ALERT_THRESHOLD_DAYS = 3;

function toOutput(row: InventoryAlertSetting, isDefault = false): InventoryAlertSettingOutput {
  return {
    id: row.id,
    stockItemId: row.stockItemId,
    warehouseId: row.warehouseId,
    minStockAlertQty: row.minStockAlertQty,
    alertThresholdDays: row.alertThresholdDays,
    alertEnabled: row.alertEnabled,
    isDefault,
  };
}

function buildDefault(input: InventoryAlertSettingLookupInput): InventoryAlertSettingOutput {
  return {
    id: null,
    stockItemId: input.stockItemId,
    warehouseId: input.warehouseId ?? null,
    minStockAlertQty: null,
    alertThresholdDays: DEFAULT_ALERT_THRESHOLD_DAYS,
    alertEnabled: true,
    isDefault: true,
  };
}

function validateSettingInput(input: InventoryAlertSettingUpsertInput) {
  if (input.minStockAlertQty !== undefined && input.minStockAlertQty !== null && input.minStockAlertQty < 0) {
    throw new BadRequestException("minStockAlertQty debe ser mayor o igual a 0");
  }
  if (input.alertThresholdDays !== undefined && input.alertThresholdDays <= 0) {
    throw new BadRequestException("alertThresholdDays debe ser mayor a 0");
  }
}

@Injectable()
export class ListInventoryAlertSettingsUsecase {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_ALERT_SETTING_REPOSITORY)
    private readonly repo: InventoryAlertSettingRepository,
  ) {}

  async execute(input: InventoryAlertSettingListInput): Promise<InventoryAlertSettingOutput[]> {
    const rows = await this.repo.list(input);
    return rows.map((row) => toOutput(row));
  }
}

@Injectable()
export class GetInventoryAlertSettingUsecase {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_ALERT_SETTING_REPOSITORY)
    private readonly repo: InventoryAlertSettingRepository,
  ) {}

  async execute(input: InventoryAlertSettingLookupInput): Promise<InventoryAlertSettingOutput> {
    const row = await this.repo.findEffective(input);
    return row ? toOutput(row) : buildDefault(input);
  }
}

@Injectable()
export class UpsertInventoryAlertSettingUsecase {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_ALERT_SETTING_REPOSITORY)
    private readonly repo: InventoryAlertSettingRepository,
  ) {}

  async execute(input: InventoryAlertSettingUpsertInput): Promise<InventoryAlertSettingOutput> {
    validateSettingInput(input);
    const row = await this.repo.upsert(input);
    return toOutput(row);
  }
}
