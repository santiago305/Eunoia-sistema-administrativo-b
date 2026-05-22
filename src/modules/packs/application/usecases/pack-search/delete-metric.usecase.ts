import { Inject, NotFoundException } from "@nestjs/common";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";

const PACKS_SEARCH_TABLE_KEY = "packs";

export class DeletePackSearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(userId: string, metricId: string) {
    const deleted = await this.searchStorage.deleteMetric({
      userId,
      tableKey: PACKS_SEARCH_TABLE_KEY,
      metricId,
    });

    if (!deleted) {
      throw new NotFoundException("No se encontro la metrica solicitada");
    }

    return { message: "Metrica eliminada correctamente" };
  }
}
