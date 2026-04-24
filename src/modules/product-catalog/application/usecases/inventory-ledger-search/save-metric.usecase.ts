import { Inject } from "@nestjs/common";
import type { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import type { SaveInventoryLedgerSearchMetricInput } from "../../dtos/inventory-ledger-search/input/save-inventory-ledger-search-metric.input";
import {
  hasInventoryLedgerSearchCriteria,
  resolveInventoryLedgerTableKey,
  sanitizeInventoryLedgerSearchSnapshot,
} from "../../support/inventory-ledger-search.utils";

export class SaveInventoryLedgerSearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: SaveInventoryLedgerSearchMetricInput) {
    const snapshot = sanitizeInventoryLedgerSearchSnapshot(input.snapshot);
    if (!hasInventoryLedgerSearchCriteria(snapshot)) {
      return { type: "error" as const, message: "No hay filtros para guardar en la metrica" };
    }

    const name = input.name.trim();
    if (!name) {
      return { type: "error" as const, message: "El nombre de la metrica es obligatorio" };
    }

    const tableKey = resolveInventoryLedgerTableKey({
      productType: input.productType as ProductCatalogProductType | undefined,
    });

    const metric = await this.searchStorage.createMetric({
      userId: input.userId,
      tableKey,
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

