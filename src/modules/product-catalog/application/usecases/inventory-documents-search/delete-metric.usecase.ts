import { Inject } from "@nestjs/common";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import type { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import { resolveInventoryDocumentsTableKey } from "../../support/inventory-documents-search.utils";

export class DeleteInventoryDocumentsSearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(params: {
    userId: string;
    metricId: string;
    docType: DocType;
    productType?: ProductCatalogProductType;
  }) {
    const tableKey = resolveInventoryDocumentsTableKey({
      docType: params.docType,
      productType: params.productType,
    });

    const deleted = await this.searchStorage.deleteMetric({
      userId: params.userId,
      tableKey,
      metricId: params.metricId,
    });

    return {
      type: deleted ? "success" : "error",
      message: deleted
        ? "Metrica eliminada correctamente"
        : "No se encontro la metrica solicitada",
    };
  }
}

