import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SALE_ORDER_SEARCH, SaleOrderSearchRepository } from "src/modules/sale-orders/domain/ports/sale-order-search.repository";
import {
  SaleOrderListItemOutput,
  SaleOrderSearchRule,
} from "src/modules/sale-orders/application/dtos/sale-order-search/sale-order-search-snapshot";
import {
  hasSaleOrderSearchCriteria,
  sanitizeSaleOrderSearchSnapshot,
} from "src/modules/sale-orders/application/support/sale-order-search.utils";

const SALE_ORDERS_SEARCH_TABLE_KEY = "sale-orders";

export class ListSaleOrdersUsecase {
  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    @Inject(SALE_ORDER_SEARCH)
    private readonly saleOrderSearchRepo: SaleOrderSearchRepository,
  ) {}

  async execute(input: {
    q?: string;
    filters?: SaleOrderSearchRule[];
    page?: number;
    limit?: number;
    requestedBy?: string;
  }): Promise<PaginatedResult<SaleOrderListItemOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const snapshot = sanitizeSaleOrderSearchSnapshot({
      q: input.q,
      filters: input.filters ?? [],
    });

    const { items, total } = await this.saleOrderRepo.list({
      q: input.q,
      filters: snapshot.filters,
      page,
      limit,
    });

    if (input.requestedBy && hasSaleOrderSearchCriteria(snapshot)) {
      try {
        await this.saleOrderSearchRepo.touchRecentSearch({
          userId: input.requestedBy,
          tableKey: SALE_ORDERS_SEARCH_TABLE_KEY,
          snapshot,
        });
      } catch {
        // non-blocking
      }
    }

    return { items, total, page, limit };
  }
}
