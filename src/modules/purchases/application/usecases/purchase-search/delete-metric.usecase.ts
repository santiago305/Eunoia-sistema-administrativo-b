import { Inject } from "@nestjs/common";
import { PURCHASE_SEARCH, PurchaseSearchRepository } from "src/modules/purchases/domain/ports/purchase-search.repository";

const PURCHASE_SEARCH_TABLE_KEY = "purchase-orders";

export class DeletePurchaseOrderSearchMetricUsecase {
  constructor(
    @Inject(PURCHASE_SEARCH)
    private readonly purchaseSearchRepo: PurchaseSearchRepository,
  ) {}

  async execute(userId: string, metricId: string) {
    const deleted = await this.purchaseSearchRepo.deleteMetric({
      userId,
      tableKey: PURCHASE_SEARCH_TABLE_KEY,
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
