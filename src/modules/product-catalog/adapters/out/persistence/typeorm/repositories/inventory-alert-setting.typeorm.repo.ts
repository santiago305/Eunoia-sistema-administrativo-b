import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import {
  InventoryAlertSetting,
  InventoryAlertSettingListInput,
  InventoryAlertSettingLookupInput,
  InventoryAlertSettingRepository,
  InventoryAlertSettingUpsertInput,
} from "src/modules/product-catalog/domain/ports/inventory-alert-setting.repository";
import { ProductCatalogInventoryAlertSettingEntity } from "../entities/inventory-alert-setting.entity";

@Injectable()
export class ProductCatalogInventoryAlertSettingTypeormRepository implements InventoryAlertSettingRepository {
  constructor(
    @InjectRepository(ProductCatalogInventoryAlertSettingEntity)
    private readonly repo: Repository<ProductCatalogInventoryAlertSettingEntity>,
  ) {}

  private toDomain(row: ProductCatalogInventoryAlertSettingEntity): InventoryAlertSetting {
    return {
      id: row.id,
      stockItemId: row.stockItemId,
      warehouseId: row.warehouseId ?? null,
      minStockAlertQty: row.minStockAlertQty ?? null,
      alertThresholdDays: Number(row.alertThresholdDays),
      alertEnabled: row.alertEnabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async list(input: InventoryAlertSettingListInput): Promise<InventoryAlertSetting[]> {
    const where: Record<string, unknown> = {};
    if (input.stockItemId) where.stockItemId = input.stockItemId;
    if (input.warehouseId !== undefined) where.warehouseId = input.warehouseId === null ? IsNull() : input.warehouseId;
    const rows = await this.repo.find({ where, order: { updatedAt: "DESC" } });
    return rows.map((row) => this.toDomain(row));
  }

  async findEffective(input: InventoryAlertSettingLookupInput): Promise<InventoryAlertSetting | null> {
    if (input.warehouseId) {
      const warehouseSetting = await this.repo.findOne({
        where: { stockItemId: input.stockItemId, warehouseId: input.warehouseId },
      });
      if (warehouseSetting) return this.toDomain(warehouseSetting);
    }

    const globalSetting = await this.repo.findOne({
      where: { stockItemId: input.stockItemId, warehouseId: IsNull() },
    });
    return globalSetting ? this.toDomain(globalSetting) : null;
  }

  async upsert(input: InventoryAlertSettingUpsertInput): Promise<InventoryAlertSetting> {
    const warehouseId = input.warehouseId ?? null;
    const where = {
      stockItemId: input.stockItemId,
      warehouseId: warehouseId === null ? IsNull() : warehouseId,
    };
    const current = await this.repo.findOne({ where });

    const saved = await this.repo.save({
      id: current?.id,
      stockItemId: input.stockItemId,
      warehouseId,
      minStockAlertQty: input.minStockAlertQty === undefined ? current?.minStockAlertQty ?? null : input.minStockAlertQty,
      alertThresholdDays: input.alertThresholdDays ?? current?.alertThresholdDays ?? 3,
      alertEnabled: input.alertEnabled ?? current?.alertEnabled ?? true,
    });

    return this.toDomain(saved);
  }
}
