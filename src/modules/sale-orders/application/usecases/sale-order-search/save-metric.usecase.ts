import { Inject } from "@nestjs/common";
import { SaveSaleOrderSearchMetricInput } from "src/modules/sale-orders/application/dtos/sale-order-search/input/save-sale-order-search-metric.input";
import {
  hasSaleOrderSearchCriteria,
  sanitizeSaleOrderSearchSnapshot,
} from "src/modules/sale-orders/application/support/sale-order-search.utils";
import { SALE_ORDER_SEARCH, SaleOrderSearchRepository } from "src/modules/sale-orders/domain/ports/sale-order-search.repository";

const SALE_ORDERS_SEARCH_TABLE_KEY = "sale-orders";

export class SaveSaleOrderSearchMetricUsecase {
  constructor(
    @Inject(SALE_ORDER_SEARCH)
    private readonly saleOrderSearchRepo: SaleOrderSearchRepository,
  ) {}

  async execute(input: SaveSaleOrderSearchMetricInput) {
    const snapshot = sanitizeSaleOrderSearchSnapshot(input.snapshot);
    if (!hasSaleOrderSearchCriteria(snapshot)) {
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

    const metric = await this.saleOrderSearchRepo.createMetric({
      userId: input.userId,
      tableKey: SALE_ORDERS_SEARCH_TABLE_KEY,
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
