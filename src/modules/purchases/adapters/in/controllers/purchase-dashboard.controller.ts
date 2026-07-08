import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { PURCHASE_DASHBOARD, PurchaseDashboardReader } from "src/modules/purchases/application/services/purchase-dashboard.service";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { HttpPurchaseDashboardQueryDto } from "../dtos/purchase-dashboard/http-purchase-dashboard-query.dto";

@Controller("purchases/dashboard")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class PurchaseDashboardController {
  constructor(
    @Inject(PURCHASE_DASHBOARD)
    private readonly dashboard: PurchaseDashboardReader,
  ) {}

  @Get("summary")
  @RequirePermissions("purchases_dashboard.view")
  summary(@Query() query: HttpPurchaseDashboardQueryDto) {
    return this.dashboard.summary(query);
  }

  @Get("by-type")
  @RequirePermissions("purchases_dashboard.view")
  byType(@Query() query: HttpPurchaseDashboardQueryDto) {
    return this.dashboard.byType(query);
  }

  @Get("by-status")
  @RequirePermissions("purchases_dashboard.view")
  byStatus(@Query() query: HttpPurchaseDashboardQueryDto) {
    return this.dashboard.byStatus(query);
  }

  @Get("top-items")
  @RequirePermissions("purchases_dashboard.view", "purchases_dashboard.view_items")
  topItems(@Query() query: HttpPurchaseDashboardQueryDto) {
    return this.dashboard.topItems(query);
  }

  @Get("top-suppliers")
  @RequirePermissions("purchases_dashboard.view", "purchases_dashboard.view_suppliers")
  topSuppliers(@Query() query: HttpPurchaseDashboardQueryDto) {
    return this.dashboard.topSuppliers(query);
  }

  @Get("monthly-spending")
  @RequirePermissions("purchases_dashboard.view", "purchases_dashboard.view_costs")
  monthlySpending(@Query() query: HttpPurchaseDashboardQueryDto) {
    return this.dashboard.monthlySpending(query);
  }

  @Get("upcoming-payments")
  @RequirePermissions("purchases_dashboard.view", "purchases_dashboard.view_payments")
  upcomingPayments(@Query() query: HttpPurchaseDashboardQueryDto) {
    return this.dashboard.upcomingPayments(query);
  }

  @Get("overdue-payments")
  @RequirePermissions("purchases_dashboard.view", "purchases_dashboard.view_payments")
  overduePayments(@Query() query: HttpPurchaseDashboardQueryDto) {
    return this.dashboard.overduePayments(query);
  }

  @Get("payment-method-usage")
  @RequirePermissions("purchases_dashboard.view", "purchases_dashboard.view_payments")
  paymentMethodUsage(@Query() query: HttpPurchaseDashboardQueryDto) {
    return this.dashboard.paymentMethodUsage(query);
  }

  @Get("internal-vs-inventory")
  @RequirePermissions("purchases_dashboard.view", "purchases_dashboard.view_operations")
  internalVsInventory(@Query() query: HttpPurchaseDashboardQueryDto) {
    return this.dashboard.internalVsInventory(query);
  }
}
