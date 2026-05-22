import { BadRequestException, Inject } from "@nestjs/common";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import { SavePackSearchMetricInput } from "../../dtos/pack-search/input/save-pack-search-metric.input";
import { hasPackSearchCriteria, sanitizePackSearchSnapshot } from "../../support/pack-search.utils";

const PACKS_SEARCH_TABLE_KEY = "packs";

export class SavePackSearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: SavePackSearchMetricInput) {
    const snapshot = sanitizePackSearchSnapshot(input.snapshot);
    if (!hasPackSearchCriteria(snapshot)) {
      throw new BadRequestException("No hay filtros para guardar en la metrica");
    }

    const name = input.name.trim();
    if (!name) {
      throw new BadRequestException("El nombre de la metrica es obligatorio");
    }

    const metric = await this.searchStorage.createMetric({
      userId: input.userId,
      tableKey: PACKS_SEARCH_TABLE_KEY,
      name,
      snapshot,
    });

    return {
      message: "Metrica guardada correctamente",
      metric,
    };
  }
}
