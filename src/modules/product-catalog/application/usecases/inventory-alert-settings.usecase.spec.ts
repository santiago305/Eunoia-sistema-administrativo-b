import { BadRequestException } from "@nestjs/common";
import {
  GetInventoryAlertSettingUsecase,
  ListInventoryAlertSettingsUsecase,
  UpsertInventoryAlertSettingUsecase,
} from "./inventory-alert-settings.usecase";
import {
  InventoryAlertSetting,
  InventoryAlertSettingRepository,
} from "../../domain/ports/inventory-alert-setting.repository";

class InMemoryInventoryAlertSettingRepository implements InventoryAlertSettingRepository {
  rows: InventoryAlertSetting[] = [];

  async list(input: { stockItemId?: string; warehouseId?: string | null }): Promise<InventoryAlertSetting[]> {
    return this.rows.filter((row) => {
      if (input.stockItemId && row.stockItemId !== input.stockItemId) return false;
      if (input.warehouseId !== undefined && row.warehouseId !== input.warehouseId) return false;
      return true;
    });
  }

  async findEffective(input: { stockItemId: string; warehouseId?: string | null }): Promise<InventoryAlertSetting | null> {
    const warehouseSetting = input.warehouseId
      ? this.rows.find((row) => row.stockItemId === input.stockItemId && row.warehouseId === input.warehouseId)
      : null;
    const globalSetting = this.rows.find((row) => row.stockItemId === input.stockItemId && row.warehouseId === null);
    return warehouseSetting ?? globalSetting ?? null;
  }

  async upsert(input: {
    stockItemId: string;
    warehouseId?: string | null;
    minStockAlertQty?: number | null;
    alertThresholdDays?: number;
    alertEnabled?: boolean;
  }): Promise<InventoryAlertSetting> {
    const now = new Date("2026-06-19T00:00:00.000Z");
    const warehouseId = input.warehouseId ?? null;
    const current = this.rows.find((row) => row.stockItemId === input.stockItemId && row.warehouseId === warehouseId);
    if (current) {
      current.minStockAlertQty = input.minStockAlertQty ?? null;
      current.alertThresholdDays = input.alertThresholdDays ?? current.alertThresholdDays;
      current.alertEnabled = input.alertEnabled ?? current.alertEnabled;
      current.updatedAt = now;
      return current;
    }

    const created: InventoryAlertSetting = {
      id: `setting-${this.rows.length + 1}`,
      stockItemId: input.stockItemId,
      warehouseId,
      minStockAlertQty: input.minStockAlertQty ?? null,
      alertThresholdDays: input.alertThresholdDays ?? 3,
      alertEnabled: input.alertEnabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(created);
    return created;
  }
}

describe("Inventory alert settings usecases", () => {
  const stockItemId = "11111111-1111-4111-8111-111111111111";
  const warehouseId = "22222222-2222-4222-8222-222222222222";

  it("returns a virtual default setting when no persisted setting exists", async () => {
    const repo = new InMemoryInventoryAlertSettingRepository();
    const usecase = new GetInventoryAlertSettingUsecase(repo);

    await expect(usecase.execute({ stockItemId, warehouseId })).resolves.toEqual({
      id: null,
      stockItemId,
      warehouseId,
      minStockAlertQty: null,
      alertThresholdDays: 3,
      alertEnabled: true,
      isDefault: true,
    });
  });

  it("uses warehouse specific settings before global stock item settings", async () => {
    const repo = new InMemoryInventoryAlertSettingRepository();
    await repo.upsert({ stockItemId, alertThresholdDays: 5, alertEnabled: true });
    await repo.upsert({ stockItemId, warehouseId, alertThresholdDays: 2, minStockAlertQty: 10, alertEnabled: false });
    const usecase = new GetInventoryAlertSettingUsecase(repo);

    await expect(usecase.execute({ stockItemId, warehouseId })).resolves.toMatchObject({
      stockItemId,
      warehouseId,
      minStockAlertQty: 10,
      alertThresholdDays: 2,
      alertEnabled: false,
      isDefault: false,
    });
  });

  it("rejects negative minimum stock and non-positive coverage days", async () => {
    const repo = new InMemoryInventoryAlertSettingRepository();
    const usecase = new UpsertInventoryAlertSettingUsecase(repo);

    await expect(usecase.execute({ stockItemId, minStockAlertQty: -1 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(usecase.execute({ stockItemId, alertThresholdDays: 0 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("lists persisted settings without creating virtual defaults", async () => {
    const repo = new InMemoryInventoryAlertSettingRepository();
    await repo.upsert({ stockItemId, alertThresholdDays: 4 });
    const usecase = new ListInventoryAlertSettingsUsecase(repo);

    await expect(usecase.execute({ stockItemId })).resolves.toHaveLength(1);
  });
});
