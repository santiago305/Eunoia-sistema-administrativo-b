import { Inject } from "@nestjs/common";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import type { SaveInventorySearchMetricInput } from "../../dtos/inventory-search/input/save-inventory-search-metric.input";
import {
  hasInventorySearchCriteria,
  resolveInventoryTableKey,
  sanitizeInventorySearchSnapshot,
} from "../../support/inventory-search.utils";

export class SaveInventorySearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: SaveInventorySearchMetricInput) {
    const snapshot = sanitizeInventorySearchSnapshot(input.snapshot);
    if (!hasInventorySearchCriteria(snapshot)) {
      return { type: "error" as const, message: "No hay filtros para guardar en la metrica" };
    }

    const name = input.name.trim();
    if (!name) {
      return { type: "error" as const, message: "El nombre de la metrica es obligatorio" };
    }

    const metric = await this.searchStorage.createMetric({
      userId: input.userId,
      tableKey: resolveInventoryTableKey({ productType: input.productType }),
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
