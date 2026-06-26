import { Inject } from "@nestjs/common";
import { PurchaseDashboardFilterInput, normalizePurchaseDashboardFilters } from "../dtos/purchase-dashboard-filter.input";
import {
  PURCHASE_DASHBOARD_QUERY_REPOSITORY,
  PurchaseDashboardQueryRepository,
} from "../../domain/ports/purchase-dashboard-query.repository";

export class GetPurchaseDashboardMonthlySpendingUsecase {
  constructor(
    @Inject(PURCHASE_DASHBOARD_QUERY_REPOSITORY)
    private readonly repo: PurchaseDashboardQueryRepository,
  ) {}

  execute(input: PurchaseDashboardFilterInput = {}) {
    return this.repo.getMonthlySpending(normalizePurchaseDashboardFilters(input));
  }
}
