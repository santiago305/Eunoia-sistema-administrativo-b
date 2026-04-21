import { Inject } from "@nestjs/common";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import { SaveWarehouseSearchMetricInput } from "../../dtos/warehouse-search/input/save-warehouse-search-metric.input";
import {
  hasWarehouseSearchCriteria,
  sanitizeWarehouseSearchSnapshot,
} from "../../support/warehouse-search.utils";

const WAREHOUSE_SEARCH_TABLE_KEY = "warehouses";

export class SaveWarehouseSearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: SaveWarehouseSearchMetricInput) {
    const snapshot = sanitizeWarehouseSearchSnapshot(input.snapshot);
    if (!hasWarehouseSearchCriteria(snapshot)) {
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
      tableKey: WAREHOUSE_SEARCH_TABLE_KEY,
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
