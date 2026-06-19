export const PRODUCT_CATALOG_INVENTORY_ALERT_SETTING_REPOSITORY = Symbol(
  "PRODUCT_CATALOG_INVENTORY_ALERT_SETTING_REPOSITORY",
);

export interface InventoryAlertSetting {
  id: string;
  stockItemId: string;
  warehouseId: string | null;
  minStockAlertQty: number | null;
  alertThresholdDays: number;
  alertEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryAlertSettingListInput {
  stockItemId?: string;
  warehouseId?: string | null;
}

export interface InventoryAlertSettingLookupInput {
  stockItemId: string;
  warehouseId?: string | null;
}

export interface InventoryAlertSettingUpsertInput {
  stockItemId: string;
  warehouseId?: string | null;
  minStockAlertQty?: number | null;
  alertThresholdDays?: number;
  alertEnabled?: boolean;
}

export interface InventoryAlertSettingRepository {
  list(input: InventoryAlertSettingListInput): Promise<InventoryAlertSetting[]>;
  findEffective(input: InventoryAlertSettingLookupInput): Promise<InventoryAlertSetting | null>;
  upsert(input: InventoryAlertSettingUpsertInput): Promise<InventoryAlertSetting>;
}
