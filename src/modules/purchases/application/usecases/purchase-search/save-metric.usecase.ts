import { Inject } from "@nestjs/common";
import { PURCHASE_SEARCH, PurchaseSearchRepository } from "src/modules/purchases/domain/ports/purchase-search.repository";
import { SavePurchaseSearchMetricInput } from "../../dtos/purchase-search/input/save-purchase-search-metric.input";
import {
  hasPurchaseSearchCriteria,
  sanitizePurchaseSearchSnapshot,
} from "../../support/purchase-search.utils";

const PURCHASE_SEARCH_TABLE_KEY = "purchase-orders";

export class SavePurchaseOrderSearchMetricUsecase {
  constructor(
    @Inject(PURCHASE_SEARCH)
    private readonly purchaseSearchRepo: PurchaseSearchRepository,
  ) {}

  async execute(input: SavePurchaseSearchMetricInput) {
    const snapshot = sanitizePurchaseSearchSnapshot(input.snapshot);
    if (!hasPurchaseSearchCriteria(snapshot)) {
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

    const metric = await this.purchaseSearchRepo.createMetric({
      userId: input.userId,
      tableKey: PURCHASE_SEARCH_TABLE_KEY,
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
