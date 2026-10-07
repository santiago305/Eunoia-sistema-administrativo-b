import { Inject } from "@nestjs/common";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";

const INCOME_SEARCH_TABLE_KEY = "income";

export class DeleteIncomeSearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(userId: string, metricId: string) {
    const deleted = await this.searchStorage.deleteMetric({
      userId,
      tableKey: INCOME_SEARCH_TABLE_KEY,
      metricId,
    });

    return {
      type: deleted ? ("success" as const) : ("error" as const),
      message: deleted ? "Metrica eliminada correctamente" : "No se encontro la metrica solicitada",
    };
  }
}
