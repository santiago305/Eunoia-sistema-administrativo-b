import { Inject } from "@nestjs/common";
import { SALE_ORDER_SEARCH, SaleOrderSearchRepository } from "src/modules/sale-orders/domain/ports/sale-order-search.repository";

const SALE_ORDERS_SEARCH_TABLE_KEY = "sale-orders";

export class DeleteSaleOrderSearchMetricUsecase {
  constructor(
    @Inject(SALE_ORDER_SEARCH)
    private readonly saleOrderSearchRepo: SaleOrderSearchRepository,
  ) {}

  async execute(userId: string, metricId: string) {
    const deleted = await this.saleOrderSearchRepo.deleteMetric({
      userId,
      tableKey: SALE_ORDERS_SEARCH_TABLE_KEY,
      metricId,
    });

    return {
      type: deleted ? "success" : "error",
      message: deleted ? "Metrica eliminada correctamente" : "No se encontro la metrica solicitada",
    };
  }
}
