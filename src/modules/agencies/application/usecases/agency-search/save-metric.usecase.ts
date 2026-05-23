import { Inject } from "@nestjs/common";
import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from "src/shared/listing-search/domain/listing-search.repository";
import { SaveAgencySearchMetricInput } from "../../dtos/agency-search/input/save-agency-search-metric.input";
import { hasAgencySearchCriteria, sanitizeAgencySearchSnapshot } from "../../support/agency-search.utils";

const AGENCIES_SEARCH_TABLE_KEY = "agencies";

export class SaveAgencySearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: SaveAgencySearchMetricInput) {
    const snapshot = sanitizeAgencySearchSnapshot(input.snapshot);
    if (!hasAgencySearchCriteria(snapshot)) {
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
      tableKey: AGENCIES_SEARCH_TABLE_KEY,
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

