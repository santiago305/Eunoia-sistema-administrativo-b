import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { PurchaseDashboardFilterInput, normalizePurchaseDashboardFilters } from "../../../application/dtos/purchase-dashboard-filter.input";
import { GetPurchaseDashboardByTypeUsecase } from "../../../application/usecases/get-purchase-dashboard-by-type.usecase";
import { GetPurchaseDashboardMonthlySpendingUsecase } from "../../../application/usecases/get-purchase-dashboard-monthly-spending.usecase";
import { GetPurchaseDashboardSummaryUsecase } from "../../../application/usecases/get-purchase-dashboard-summary.usecase";
import { GetOverduePaymentsUsecase } from "../../../application/usecases/get-overdue-payments.usecase";
import { GetUpcomingPaymentsUsecase } from "../../../application/usecases/get-upcoming-payments.usecase";
import {
  PURCHASE_DASHBOARD_QUERY_REPOSITORY,
  PurchaseDashboardQueryRepository,
} from "../../../domain/ports/purchase-dashboard-query.repository";
import { Inject } from "@nestjs/common";

@Controller("purchases/dashboard")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class PurchaseDashboardController {
  constructor(
    private readonly summary: GetPurchaseDashboardSummaryUsecase,
    private readonly byType: GetPurchaseDashboardByTypeUsecase,
    private readonly monthlySpending: GetPurchaseDashboardMonthlySpendingUsecase,
    private readonly upcomingPayments: GetUpcomingPaymentsUsecase,
    private readonly overduePayments: GetOverduePaymentsUsecase,
    @Inject(PURCHASE_DASHBOARD_QUERY_REPOSITORY)
    private readonly queryRepo: PurchaseDashboardQueryRepository,
  ) {}

  @RequirePermissions("purchases_dashboard.view")
  @Get("summary")
  getSummary(@Query() query: PurchaseDashboardFilterInput) {
    return this.summary.execute(query);
  }

  @RequirePermissions("purchases_dashboard.view")
  @Get("by-type")
  getByType(@Query() query: PurchaseDashboardFilterInput) {
    return this.byType.execute(query);
  }

  @RequirePermissions("purchases_dashboard.view")
  @Get("by-status")
  getByStatus(@Query() query: PurchaseDashboardFilterInput) {
    return this.queryRepo.getByStatus(normalizePurchaseDashboardFilters(query));
  }

  @RequirePermissions("purchases_dashboard.view")
  @Get("top-items")
  getTopItems(@Query() query: PurchaseDashboardFilterInput) {
    return this.queryRepo.getTopItems(normalizePurchaseDashboardFilters(query));
  }

  @RequirePermissions("purchases_dashboard.view")
  @Get("top-suppliers")
  getTopSuppliers(@Query() query: PurchaseDashboardFilterInput) {
    return this.queryRepo.getTopSuppliers(normalizePurchaseDashboardFilters(query));
  }

  @RequirePermissions("purchases_dashboard.view")
  @Get("monthly-spending")
  getMonthlySpending(@Query() query: PurchaseDashboardFilterInput) {
    return this.monthlySpending.execute(query);
  }

  @RequirePermissions("purchases_dashboard.view")
  @Get("upcoming-payments")
  getUpcomingPayments(@Query() query: PurchaseDashboardFilterInput) {
    return this.upcomingPayments.execute(query);
  }

  @RequirePermissions("purchases_dashboard.view")
  @Get("overdue-payments")
  getOverduePayments(@Query() query: PurchaseDashboardFilterInput) {
    return this.overduePayments.execute(query);
  }

  @RequirePermissions("purchases_dashboard.view")
  @Get("payment-method-usage")
  getPaymentMethodUsage(@Query() query: PurchaseDashboardFilterInput) {
    return this.queryRepo.getPaymentMethodUsage(normalizePurchaseDashboardFilters(query));
  }

  @RequirePermissions("purchases_dashboard.view")
  @Get("internal-vs-inventory")
  getInternalVsInventory(@Query() query: PurchaseDashboardFilterInput) {
    return this.queryRepo.getInternalVsInventory(normalizePurchaseDashboardFilters(query));
  }
}
