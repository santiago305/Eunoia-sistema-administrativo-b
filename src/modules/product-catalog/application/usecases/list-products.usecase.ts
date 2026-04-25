import { Inject, Injectable } from "@nestjs/common";
import { ProductCatalogProductType } from "../../domain/value-objects/product-type";
import {
  PRODUCT_CATALOG_PRODUCT_REPOSITORY,
  ProductCatalogProductRepository,
  ProductCatalogProductSearchRule,
} from "../../domain/ports/product.repository";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import {
  hasProductCatalogProductSearchCriteria,
  resolveProductCatalogSearchTableKey,
  sanitizeProductCatalogProductSearchSnapshot,
} from "../support/product-search.utils";

@Injectable()
export class ListProductCatalogProducts {
  constructor(
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly repo: ProductCatalogProductRepository,
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(params: {
    page?: number;
    limit?: number;
    q?: string;
    isActive?: boolean;
    type?: ProductCatalogProductType;
    filters?: ProductCatalogProductSearchRule[];
    requestedBy?: string;
  }) {
    const snapshot = sanitizeProductCatalogProductSearchSnapshot({
      q: params.q,
      filters: params.filters ?? [],
    });
    const tableKey = resolveProductCatalogSearchTableKey(params.type);

    const response = await this.repo.list({
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      q: snapshot.q,
      isActive: params.isActive,
      type: params.type,
      filters: snapshot.filters,
    });

    if (params.requestedBy && hasProductCatalogProductSearchCriteria(snapshot)) {
      await this.searchStorage.touchRecentSearch({
        userId: params.requestedBy,
        tableKey,
        snapshot,
      });
    }

    return response;
  }
}
