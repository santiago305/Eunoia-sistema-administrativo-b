import { Inject } from "@nestjs/common";
import type { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import type { DeleteInventoryLedgerSearchMetricInput } from "../../dtos/inventory-ledger-search/input/delete-inventory-ledger-search-metric.input";
import { resolveInventoryLedgerTableKey } from "../../support/inventory-ledger-search.utils";

export class DeleteInventoryLedgerSearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(params: DeleteInventoryLedgerSearchMetricInput) {
    const tableKey = resolveInventoryLedgerTableKey({
      productType: params.productType as ProductCatalogProductType | undefined,
    });

    const deleted = await this.searchStorage.deleteMetric({
      userId: params.userId,
      tableKey,
      metricId: params.metricId,
    });

    return {
      type: deleted ? "success" : "error",
      message: deleted ? "Metrica eliminada correctamente" : "No se encontro la metrica solicitada",
    };
  }
}

