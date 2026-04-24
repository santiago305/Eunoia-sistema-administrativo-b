import { Inject } from "@nestjs/common";
import type { ProductCatalogProductSearchStateOutput } from "../../dtos/product-search/output/product-search-state.output";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import type { ProductCatalogProductSearchSnapshot } from "../../dtos/product-search/product-search-snapshot";
import {
  buildProductCatalogProductSearchLabel,
  PRODUCT_STATUS_SEARCH_OPTIONS,
  resolveProductCatalogSearchTableKey,
  sanitizeProductCatalogProductSearchSnapshot,
} from "../../support/product-search.utils";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";

export class GetProductCatalogProductSearchStateUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(userId: string, type?: ProductCatalogProductType): Promise<ProductCatalogProductSearchStateOutput> {
    const tableKey = resolveProductCatalogSearchTableKey(type);
    const state = await this.searchStorage.listState({
      userId,
      tableKey,
    });

    const maps = {
      statuses: new Map(PRODUCT_STATUS_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
    };

    return {
      recent: state.recent.map((item) => {
        const snapshot = sanitizeProductCatalogProductSearchSnapshot(
          item.snapshot as ProductCatalogProductSearchSnapshot,
        );
        return {
          recentId: item.recentId,
          label: buildProductCatalogProductSearchLabel(snapshot, maps),
          snapshot,
          lastUsedAt: item.lastUsedAt,
        };
      }),
      saved: state.metrics.map((item) => {
        const snapshot = sanitizeProductCatalogProductSearchSnapshot(
          item.snapshot as ProductCatalogProductSearchSnapshot,
        );
        return {
          metricId: item.metricId,
          name: item.name,
          label: buildProductCatalogProductSearchLabel(snapshot, maps),
          snapshot,
          updatedAt: item.updatedAt,
        };
      }),
      catalogs: {
        statuses: PRODUCT_STATUS_SEARCH_OPTIONS,
      },
    };
  }
}
