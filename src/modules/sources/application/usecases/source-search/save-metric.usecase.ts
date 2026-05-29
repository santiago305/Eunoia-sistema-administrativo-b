import { Inject } from "@nestjs/common";
import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from "src/shared/listing-search/domain/listing-search.repository";
import { SaveSourceSearchMetricInput } from "../../dtos/source-search/input/save-source-search-metric.input";
import { hasSourceSearchCriteria, sanitizeSourceSearchSnapshot } from "../../support/source-search.utils";

const SOURCES_SEARCH_TABLE_KEY = "sources";

export class SaveSourceSearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: SaveSourceSearchMetricInput) {
    const snapshot = sanitizeSourceSearchSnapshot(input.snapshot);
    if (!hasSourceSearchCriteria(snapshot)) {
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
      tableKey: SOURCES_SEARCH_TABLE_KEY,
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

