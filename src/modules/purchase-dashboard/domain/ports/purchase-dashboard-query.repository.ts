import { PurchaseDashboardFilters } from "../../application/dtos/purchase-dashboard-filter.input";
import {
  PurchaseDashboardMonthlyPoint,
  PurchaseDashboardPaymentRow,
  PurchaseDashboardSeriesPoint,
  PurchaseDashboardSummaryOutput,
  PurchaseDashboardTopItem,
  PurchaseDashboardTopSupplier,
} from "../../application/dtos/purchase-dashboard.output";

export const PURCHASE_DASHBOARD_QUERY_REPOSITORY = Symbol("PURCHASE_DASHBOARD_QUERY_REPOSITORY");

export interface PurchaseDashboardQueryRepository {
  getSummary(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardSummaryOutput>;
  getByType(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardSeriesPoint[]>;
  getByStatus(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardSeriesPoint[]>;
  getMonthlySpending(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardMonthlyPoint[]>;
  getUpcomingPayments(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardPaymentRow[]>;
  getOverduePayments(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardPaymentRow[]>;
  getTopItems(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardTopItem[]>;
  getTopSuppliers(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardTopSupplier[]>;
  getPaymentMethodUsage(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardSeriesPoint[]>;
  getInternalVsInventory(filters: PurchaseDashboardFilters): Promise<PurchaseDashboardSeriesPoint[]>;
}
