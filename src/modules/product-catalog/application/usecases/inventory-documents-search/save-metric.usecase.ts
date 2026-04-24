import { Inject } from "@nestjs/common";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import type { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import type { SaveInventoryDocumentsSearchMetricInput } from "../../dtos/inventory-documents-search/input/save-inventory-documents-search-metric.input";
import {
  hasInventoryDocumentsSearchCriteria,
  resolveInventoryDocumentsTableKey,
  sanitizeInventoryDocumentsSearchSnapshot,
} from "../../support/inventory-documents-search.utils";

export class SaveInventoryDocumentsSearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: SaveInventoryDocumentsSearchMetricInput) {
    const snapshot = sanitizeInventoryDocumentsSearchSnapshot(input.snapshot);
    if (!hasInventoryDocumentsSearchCriteria(snapshot)) {
      return {
        type: "error" as const,
        message: "No hay filtros para guardar en la metrica",
      };
    }

    const name = input.name.trim();
    if (!name) {
      return {
        type: "error" as const,
        message: "El nombre de la metrica es obligatorio",
      };
    }

    const tableKey = resolveInventoryDocumentsTableKey({
      docType: input.docType as DocType,
      productType: input.productType as ProductCatalogProductType | undefined,
    });

    const metric = await this.searchStorage.createMetric({
      userId: input.userId,
      tableKey,
      name,
      snapshot,
    });

    return {
      type: "success" as const,
      message: "Metrica guardada correctamente",
      metric,
    };
  }
}

