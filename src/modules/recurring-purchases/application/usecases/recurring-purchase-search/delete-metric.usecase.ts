import { Inject } from "@nestjs/common";
import {
  RECURRING_PURCHASE_SEARCH,
  RecurringPurchaseSearchRepository,
} from "src/modules/recurring-purchases/domain/ports/recurring-purchase-search.repository";

const RECURRING_PURCHASE_SEARCH_TABLE_KEY = "recurring-purchases";

export class DeleteRecurringPurchaseSearchMetricUsecase {
  constructor(
    @Inject(RECURRING_PURCHASE_SEARCH)
    private readonly searchRepo: RecurringPurchaseSearchRepository,
  ) {}

  async execute(userId: string, metricId: string) {
    const deleted = await this.searchRepo.deleteMetric({
      userId,
      tableKey: RECURRING_PURCHASE_SEARCH_TABLE_KEY,
      metricId,
    });

    return {
      type: deleted ? ("success" as const) : ("error" as const),
      message: deleted
        ? "Metrica eliminada correctamente"
        : "No se encontro la metrica solicitada",
    };
  }
}
