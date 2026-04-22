import { Inject, Injectable } from "@nestjs/common";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "../../domain/ports/inventory.repository";
import { ProductCatalogProductType } from "../../domain/value-objects/product-type";

@Injectable()
export class ListAvailableStockUsecase {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
  ) {}

  private calcAvailable(onHand: number, reserved: number) {
    return Math.max(0, onHand - reserved);
  }

  async execute(params: {
    warehouseId?: string;
    q?: string;
    isActive?: boolean;
    skuId?: string;
    productType?: ProductCatalogProductType;
  }) {
    const { items } = await this.inventoryRepo.searchSnapshots({
      warehouseId: params.warehouseId,
      q: params.q,
      isActive: params.isActive,
      skuId: params.skuId,
      productType: params.productType,
      page: undefined,
      limit: undefined,
    });

    const bySku = new Map<
      string,
      {
        skuId: string;
        stockItemId: string;
        byWarehouse: Map<
          string,
          { warehouseId: string; warehouseName: string; onHand: number; reserved: number; updatedAt: Date | null }
        >;
      }
    >();

    for (const row of items) {
      const skuId = row.skuId;
      const existingSku = bySku.get(skuId);
      const skuEntry =
        existingSku ??
        (() => {
          const created = {
            skuId,
            stockItemId: row.stockItemId,
            byWarehouse: new Map<
              string,
              { warehouseId: string; warehouseName: string; onHand: number; reserved: number; updatedAt: Date | null }
            >(),
          };
          bySku.set(skuId, created);
          return created;
        })();

      const updatedAt = row.updatedAt ?? null;
      const whKey = row.warehouseId;
      const existingWh = skuEntry.byWarehouse.get(whKey);
      if (!existingWh) {
        skuEntry.byWarehouse.set(whKey, {
          warehouseId: row.warehouseId,
          warehouseName: row.warehouseName,
          onHand: row.onHand,
          reserved: row.reserved,
          updatedAt,
        });
        continue;
      }

      skuEntry.byWarehouse.set(whKey, {
        warehouseId: existingWh.warehouseId,
        warehouseName: existingWh.warehouseName || row.warehouseName,
        onHand: existingWh.onHand + row.onHand,
        reserved: existingWh.reserved + row.reserved,
        updatedAt: !existingWh.updatedAt || (updatedAt && updatedAt > existingWh.updatedAt) ? updatedAt : existingWh.updatedAt,
      });
    }

    const outItems = Array.from(bySku.values()).map((skuRow) => {
      const availabilityByWarehouse = Array.from(skuRow.byWarehouse.values())
        .map((w) => ({
          warehouseId: w.warehouseId,
          warehouseName: w.warehouseName,
          onHand: w.onHand,
          reserved: w.reserved,
          available: this.calcAvailable(w.onHand, w.reserved),
          updatedAt: w.updatedAt ?? null,
        }))
        .sort((a, b) => a.warehouseName.localeCompare(b.warehouseName));

      const totalsBase = availabilityByWarehouse.reduce(
        (acc, w) => ({
          onHand: acc.onHand + w.onHand,
          reserved: acc.reserved + w.reserved,
        }),
        { onHand: 0, reserved: 0 },
      );

      return {
        skuId: skuRow.skuId,
        stockItemId: skuRow.stockItemId,
        availabilityByWarehouse,
        totals: {
          onHand: totalsBase.onHand,
          reserved: totalsBase.reserved,
          available: this.calcAvailable(totalsBase.onHand, totalsBase.reserved),
        },
      };
    });

    return {
      items: outItems,
      total: outItems.length,
    };
  }
}
