import { ForbiddenException, Inject } from "@nestjs/common";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SaleOrderSearchRule } from "../../dtos/sale-order-search/sale-order-search-snapshot";
import { sanitizeSaleOrderSearchSnapshot } from "../../support/sale-order-search.utils";
import { SaleOrderAccessPolicyService } from "../../services/sale-order-access-policy.service";

export class GetSaleOrderStatisticsUsecase {
  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    private readonly accessPolicy?: SaleOrderAccessPolicyService,
  ) {}

  async execute(input: {
    q?: string;
    filters?: SaleOrderSearchRule[];
    includeCancelled?: boolean;
    isActive?: boolean;
    requestedBy?: string;
  }) {
    const snapshot = sanitizeSaleOrderSearchSnapshot(input);
    const readContext = input.requestedBy && this.accessPolicy
      ? await this.accessPolicy.resolveReadContext(input.requestedBy)
      : undefined;
    if (input.isActive === false && !readContext?.includeDeleted) {
      throw new ForbiddenException("No tienes permiso para ver pedidos eliminados");
    }
    return this.saleOrderRepo.statistics({
      q: snapshot.q,
      filters: snapshot.filters,
      includeCancelled: input.includeCancelled ?? false,
      isActive: input.isActive ?? true,
      readContext,
    });
  }
}
