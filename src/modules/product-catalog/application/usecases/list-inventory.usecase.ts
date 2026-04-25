import { Inject, Injectable } from "@nestjs/common";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventorySearchRule,
  ProductCatalogInventoryRepository,
} from "../../domain/ports/inventory.repository";
import {
  PRODUCT_CATALOG_SKU_REPOSITORY,
  ProductCatalogSkuRepository,
  ProductCatalogSkuWithAttributes,
} from "../../domain/ports/sku.repository";
import { ProductCatalogProductType } from "../../domain/value-objects/product-type";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import {
  hasInventorySearchCriteria,
  resolveInventoryTableKey,
  sanitizeInventorySearchSnapshot,
} from "../support/inventory-search.utils";

@Injectable()
export class ListProductCatalogInventory {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
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
    warehouseIdsIn?: string[];
    warehouseIdsNotIn?: string[];
    q?: string;
    isActive?: boolean;
    skuId?: string;
    skuIdsIn?: string[];
    skuIdsNotIn?: string[];
    productType?: ProductCatalogProductType;
    filters?: ProductCatalogInventorySearchRule[];
    page?: number;
    limit?: number;
    requestedBy?: string;
  }) {
    const shouldPaginate = params.page !== undefined || params.limit !== undefined;
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 25;
    const snapshot = sanitizeInventorySearchSnapshot({
      q: params.q,
      filters: (params.filters ?? []) as any,
    });

    const { items, total } = await this.inventoryRepo.searchSnapshots({
      warehouseId: params.warehouseId,
      warehouseIdsIn: params.warehouseIdsIn,
      warehouseIdsNotIn: params.warehouseIdsNotIn,
      q: snapshot.q,
      isActive: params.isActive,
      skuId: params.skuId,
      skuIdsIn: params.skuIdsIn,
      skuIdsNotIn: params.skuIdsNotIn,
      productType: params.productType,
      filters: snapshot.filters as ProductCatalogInventorySearchRule[],
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

    if (params.requestedBy && hasInventorySearchCriteria(snapshot)) {
      await this.searchStorage.touchRecentSearch({
        userId: params.requestedBy,
        tableKey: resolveInventoryTableKey({ productType: params.productType }),
        snapshot,
      });
    }

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
