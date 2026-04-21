import { Inject } from "@nestjs/common";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import { SaveSupplierSearchMetricInput } from "../../dtos/supplier-search/input/save-supplier-search-metric.input";
import {
  hasSupplierSearchCriteria,
  sanitizeSupplierSearchSnapshot,
} from "../../support/supplier-search.utils";

const SUPPLIER_SEARCH_TABLE_KEY = "suppliers";

export class SaveSupplierSearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: SaveSupplierSearchMetricInput) {
    const snapshot = sanitizeSupplierSearchSnapshot(input.snapshot);
    if (!hasSupplierSearchCriteria(snapshot)) {
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
      tableKey: SUPPLIER_SEARCH_TABLE_KEY,
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
