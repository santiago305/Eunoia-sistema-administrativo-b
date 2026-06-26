import { Inject } from "@nestjs/common";
import { PurchaseDashboardFilterInput, normalizePurchaseDashboardFilters } from "../dtos/purchase-dashboard-filter.input";
import {
  PURCHASE_DASHBOARD_QUERY_REPOSITORY,
  PurchaseDashboardQueryRepository,
} from "../../domain/ports/purchase-dashboard-query.repository";

export class GetOverduePaymentsUsecase {
  constructor(
    @Inject(PURCHASE_DASHBOARD_QUERY_REPOSITORY)
    private readonly repo: PurchaseDashboardQueryRepository,
  ) {}

  execute(input: PurchaseDashboardFilterInput = {}) {
    const filters = normalizePurchaseDashboardFilters(input);
    return this.repo.getOverduePayments({ ...filters, limit: filters.limit ?? 10 });
  }
}
