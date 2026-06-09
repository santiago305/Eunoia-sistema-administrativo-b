import { Inject } from "@nestjs/common";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SaleOrderSearchRule } from "../../dtos/sale-order-search/sale-order-search-snapshot";
import { sanitizeSaleOrderSearchSnapshot } from "../../support/sale-order-search.utils";

export class GetSaleOrderStatisticsUsecase {
  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
  ) {}

  execute(input: {
    q?: string;
    filters?: SaleOrderSearchRule[];
    includeCancelled?: boolean;
  }) {
    const snapshot = sanitizeSaleOrderSearchSnapshot(input);
    return this.saleOrderRepo.statistics({
      q: snapshot.q,
      filters: snapshot.filters,
      includeCancelled: input.includeCancelled ?? false,
    });
  }
}
