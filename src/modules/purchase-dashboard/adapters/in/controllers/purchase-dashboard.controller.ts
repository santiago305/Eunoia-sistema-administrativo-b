import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from "src/shared/listing-search/domain/listing-search.repository";
import { PurchaseDashboardFilterInput, normalizePurchaseDashboardFilters } from "../../../application/dtos/purchase-dashboard-filter.input";
import { PurchaseDashboardSearchSnapshot } from "../../../application/dtos/purchase-dashboard-search-snapshot";
import {
  hasPurchaseDashboardSearchCriteria,
  sanitizePurchaseDashboardSearchSnapshot,
} from "../../../application/support/purchase-dashboard-search.utils";
import { GetPurchaseDashboardByTypeUsecase } from "../../../application/usecases/get-purchase-dashboard-by-type.usecase";
import { GetPurchaseDashboardMonthlySpendingUsecase } from "../../../application/usecases/get-purchase-dashboard-monthly-spending.usecase";
import { GetPurchaseDashboardSummaryUsecase } from "../../../application/usecases/get-purchase-dashboard-summary.usecase";
import { GetOverduePaymentsUsecase } from "../../../application/usecases/get-overdue-payments.usecase";
import { GetUpcomingPaymentsUsecase } from "../../../application/usecases/get-upcoming-payments.usecase";
import {
  PURCHASE_DASHBOARD_QUERY_REPOSITORY,
  PurchaseDashboardQueryRepository,
} from "../../../domain/ports/purchase-dashboard-query.repository";

const PURCHASE_DASHBOARD_SEARCH_TABLE_KEY = "purchase-dashboard";

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
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly listingSearchStorage: ListingSearchStorageRepository,
  ) {}

  @RequirePermissions("purchases_dashboard.view")
  @Get("summary")
  getSummary(@Query() query: PurchaseDashboardFilterInput) {
    return this.summary.execute(query);
  }

  @RequirePermissions("purchases_dashboard.view")
  @Get("search-state")
  async getSearchState(@CurrentUser() user: { id: string }) {
    const state = await this.listingSearchStorage.listState({
      userId: user.id,
      tableKey: PURCHASE_DASHBOARD_SEARCH_TABLE_KEY,
    });

    return {
      recent: state.recent.map((item) => ({
        recentId: item.recentId,
        snapshot: sanitizePurchaseDashboardSearchSnapshot(item.snapshot),
        lastUsedAt: item.lastUsedAt,
      })),
      saved: state.metrics.map((item) => ({
        metricId: item.metricId,
        name: item.name,
        snapshot: sanitizePurchaseDashboardSearchSnapshot(item.snapshot),
        updatedAt: item.updatedAt,
      })),
    };
  }

  @RequirePermissions("purchases_dashboard.view")
  @Post("search-metrics")
  async saveSearchMetric(
    @Body() dto: { name?: string; snapshot?: Partial<PurchaseDashboardSearchSnapshot> | null },
    @CurrentUser() user: { id: string },
  ) {
    const snapshot = sanitizePurchaseDashboardSearchSnapshot(dto?.snapshot);
    if (!hasPurchaseDashboardSearchCriteria(snapshot)) {
      return {
        type: "error" as const,
        message: "No hay filtros para guardar en la metrica",
      };
    }

    const name = dto?.name?.trim();
    if (!name) {
      return {
        type: "error" as const,
        message: "El nombre de la metrica es obligatorio",
      };
    }

    const metric = await this.listingSearchStorage.createMetric({
      userId: user.id,
      tableKey: PURCHASE_DASHBOARD_SEARCH_TABLE_KEY,
      name,
      snapshot,
    });

    return {
      type: "success" as const,
      message: "Metrica guardada correctamente",
      metric: {
        ...metric,
        snapshot: sanitizePurchaseDashboardSearchSnapshot(metric.snapshot),
      },
    };
  }

  @RequirePermissions("purchases_dashboard.view")
  @Delete("search-metrics/:metricId")
  async deleteSearchMetric(
    @Param("metricId", ParseUUIDPipe) metricId: string,
    @CurrentUser() user: { id: string },
  ) {
    const deleted = await this.listingSearchStorage.deleteMetric({
      userId: user.id,
      tableKey: PURCHASE_DASHBOARD_SEARCH_TABLE_KEY,
      metricId,
    });

    return {
      type: deleted ? ("success" as const) : ("error" as const),
      message: deleted
        ? "Metrica eliminada correctamente"
        : "No se encontro la metrica solicitada",
    };
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

  @RequirePermissions("purchases_dashboard.view", "purchases_dashboard.view_items")
  @Get("top-items")
  getTopItems(@Query() query: PurchaseDashboardFilterInput) {
    return this.queryRepo.getTopItems(normalizePurchaseDashboardFilters(query));
  }

  @RequirePermissions("purchases_dashboard.view", "purchases_dashboard.view_suppliers")
  @Get("top-suppliers")
  getTopSuppliers(@Query() query: PurchaseDashboardFilterInput) {
    return this.queryRepo.getTopSuppliers(normalizePurchaseDashboardFilters(query));
  }

  @RequirePermissions("purchases_dashboard.view", "purchases_dashboard.view_costs")
  @Get("monthly-spending")
  getMonthlySpending(@Query() query: PurchaseDashboardFilterInput) {
    return this.monthlySpending.execute(query);
  }

  @RequirePermissions("purchases_dashboard.view", "purchases_dashboard.view_payments")
  @Get("upcoming-payments")
  getUpcomingPayments(@Query() query: PurchaseDashboardFilterInput) {
    return this.upcomingPayments.execute(query);
  }

  @RequirePermissions("purchases_dashboard.view", "purchases_dashboard.view_payments")
  @Get("overdue-payments")
  getOverduePayments(@Query() query: PurchaseDashboardFilterInput) {
    return this.overduePayments.execute(query);
  }

  @RequirePermissions("purchases_dashboard.view", "purchases_dashboard.view_payments")
  @Get("payment-method-usage")
  getPaymentMethodUsage(@Query() query: PurchaseDashboardFilterInput) {
    return this.queryRepo.getPaymentMethodUsage(normalizePurchaseDashboardFilters(query));
  }

  @RequirePermissions("purchases_dashboard.view", "purchases_dashboard.view_operations")
  @Get("internal-vs-inventory")
  getInternalVsInventory(@Query() query: PurchaseDashboardFilterInput) {
    return this.queryRepo.getInternalVsInventory(normalizePurchaseDashboardFilters(query));
  }
}
