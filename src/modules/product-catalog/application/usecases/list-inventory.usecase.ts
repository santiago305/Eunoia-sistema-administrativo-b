import { Inject, Injectable } from "@nestjs/common";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "../../domain/ports/inventory.repository";
import {
  PRODUCT_CATALOG_SKU_REPOSITORY,
  ProductCatalogSkuRepository,
  ProductCatalogSkuWithAttributes,
} from "../../domain/ports/sku.repository";
import { ProductCatalogProductType } from "../../domain/value-objects/product-type";

@Injectable()
export class ListProductCatalogInventory {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
  ) {}

  private toInventorySkuDto(sku: ProductCatalogSkuWithAttributes) {
    return {
      sku: {
        id: sku.sku.id,
        productId: sku.sku.productId,
        backendSku: sku.sku.backendSku,
        customSku: sku.sku.customSku,
        name: sku.sku.name,
      },
      unit: sku.unit
        ? {
            id: sku.unit.id,
            name: sku.unit.name,
            code: sku.unit.code,
          }
        : undefined,
      attributes: sku.attributes.map((a) => ({
        code: a.code,
        name: a.name ?? null,
        value: a.value,
      })),
    };
  }

  async execute(params: {
    warehouseId?: string;
    q?: string;
    isActive?: boolean;
    skuId?: string;
    productType?: ProductCatalogProductType;
    page?: number;
    limit?: number;
  }) {
    const shouldPaginate = params.page !== undefined || params.limit !== undefined;
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;

    const { items, total } = await this.inventoryRepo.searchSnapshots({
      warehouseId: params.warehouseId,
      q: params.q,
      isActive: params.isActive,
      skuId: params.skuId,
      productType: params.productType,
      page: shouldPaginate ? page : undefined,
      limit: shouldPaginate ? limit : undefined,
    });

    const uniqueSkuIds = Array.from(new Set(items.map((i) => i.skuId)));
    const skus = await Promise.all(uniqueSkuIds.map((id) => this.skuRepo.findById(id)));
    const skuMap = new Map(
      uniqueSkuIds.map((id, index) => {
        const sku = skus[index];
        return [id, sku ? this.toInventorySkuDto(sku) : null] as const;
      }),
    );

    return {
      items: items.map((row) => ({
        sku: skuMap.get(row.skuId) ?? null,
        warehouseId: row.warehouseId,
        warehouseName: row.warehouseName,
        onHand: row.onHand,
        reserved: row.reserved,
        available: row.available,
      })),
      total,
      page: shouldPaginate ? page : undefined,
      limit: shouldPaginate ? limit : undefined,
    };
  }
}
