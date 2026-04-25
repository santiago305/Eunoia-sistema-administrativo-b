import { Inject } from "@nestjs/common";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import type { DeleteInventorySearchMetricInput } from "../../dtos/inventory-search/input/delete-inventory-search-metric.input";
import { resolveInventoryTableKey } from "../../support/inventory-search.utils";

export class DeleteInventorySearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(params: DeleteInventorySearchMetricInput) {
    const deleted = await this.searchStorage.deleteMetric({
      userId: params.userId,
      tableKey: resolveInventoryTableKey({ productType: params.productType }),
      metricId: params.metricId,
    });

    return {
      type: deleted ? "success" : "error",
      message: deleted ? "Metrica eliminada correctamente" : "No se encontro la metrica solicitada",
    };
  }
}
