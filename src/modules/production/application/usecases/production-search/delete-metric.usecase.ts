import { Inject } from "@nestjs/common";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";

const PRODUCTION_SEARCH_TABLE_KEY = "production-orders";

export class DeleteProductionOrderSearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(userId: string, metricId: string) {
    const deleted = await this.searchStorage.deleteMetric({
      userId,
      tableKey: PRODUCTION_SEARCH_TABLE_KEY,
      metricId,
    });

    return {
      type: deleted ? "success" : "error",
      message: deleted
        ? "Metrica eliminada correctamente"
        : "No se encontro la metrica solicitada",
    };
  }
}
