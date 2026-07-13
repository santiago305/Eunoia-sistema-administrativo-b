import { Inject } from "@nestjs/common";
import {
  RECURRING_PURCHASE_SEARCH,
  RecurringPurchaseSearchRepository,
} from "src/modules/recurring-purchases/domain/ports/recurring-purchase-search.repository";
import { SaveRecurringPurchaseSearchMetricInput } from "../../dtos/recurring-purchase-search/input/save-recurring-purchase-search-metric.input";
import {
  hasRecurringPurchaseSearchCriteria,
  sanitizeRecurringPurchaseSearchSnapshot,
} from "../../support/recurring-purchase-search.utils";

const RECURRING_PURCHASE_SEARCH_TABLE_KEY = "recurring-purchases";

export class SaveRecurringPurchaseSearchMetricUsecase {
  constructor(
    @Inject(RECURRING_PURCHASE_SEARCH)
    private readonly searchRepo: RecurringPurchaseSearchRepository,
  ) {}

  async execute(input: SaveRecurringPurchaseSearchMetricInput) {
    const snapshot = sanitizeRecurringPurchaseSearchSnapshot(input.snapshot);
    if (!hasRecurringPurchaseSearchCriteria(snapshot)) {
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

    const metric = await this.searchRepo.createMetric({
      userId: input.userId,
      tableKey: RECURRING_PURCHASE_SEARCH_TABLE_KEY,
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
