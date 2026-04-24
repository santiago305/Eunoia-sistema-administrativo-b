import { Inject } from "@nestjs/common";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import type { SaveProductCatalogProductSearchMetricInput } from "../../dtos/product-search/input/save-product-search-metric.input";
import {
  hasProductCatalogProductSearchCriteria,
  resolveProductCatalogSearchTableKey,
  sanitizeProductCatalogProductSearchSnapshot,
} from "../../support/product-search.utils";
export class SaveProductCatalogProductSearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: SaveProductCatalogProductSearchMetricInput) {
    const snapshot = sanitizeProductCatalogProductSearchSnapshot(input.snapshot);
    if (!hasProductCatalogProductSearchCriteria(snapshot)) {
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

    const tableKey = resolveProductCatalogSearchTableKey(input.type);
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
