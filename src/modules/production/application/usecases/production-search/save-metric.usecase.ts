import { Inject } from "@nestjs/common";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import { SaveProductionSearchMetricInput } from "../../dto/production-search/input/save-production-search-metric.input";
import {
  hasProductionSearchCriteria,
  sanitizeProductionSearchSnapshot,
} from "../../support/production-search.utils";

const PRODUCTION_SEARCH_TABLE_KEY = "production-orders";

export class SaveProductionOrderSearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: SaveProductionSearchMetricInput) {
    const snapshot = sanitizeProductionSearchSnapshot(input.snapshot);
    if (!hasProductionSearchCriteria(snapshot)) {
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

    const metric = await this.searchStorage.createMetric({
      userId: input.userId,
      tableKey: PRODUCTION_SEARCH_TABLE_KEY,
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
