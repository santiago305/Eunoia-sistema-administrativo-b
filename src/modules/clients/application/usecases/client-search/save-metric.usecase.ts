import { Inject } from "@nestjs/common";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import { SaveClientSearchMetricInput } from "../../dtos/client-search/input/save-client-search-metric.input";
import {
  hasClientSearchCriteria,
  sanitizeClientSearchSnapshot,
} from "../../support/client-search.utils";

const CLIENTS_SEARCH_TABLE_KEY = "clients";

export class SaveClientSearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: SaveClientSearchMetricInput) {
    const snapshot = sanitizeClientSearchSnapshot(input.snapshot);
    if (!hasClientSearchCriteria(snapshot)) {
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
      tableKey: CLIENTS_SEARCH_TABLE_KEY,
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

