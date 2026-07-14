import {
  AdminFinanceFilters,
  AdminFinanceListFilters,
  AdminFinanceMovementListOutput,
  AdminFinanceSummaryOutput,
} from "../../application/dtos/admin-finance.output";

export const ADMIN_FINANCE_QUERY_REPOSITORY = "ADMIN_FINANCE_QUERY_REPOSITORY";

export interface AdminFinanceQueryRepository {
  getSummary(filters: AdminFinanceFilters): Promise<AdminFinanceSummaryOutput>;
  listMovements(filters: AdminFinanceListFilters): Promise<AdminFinanceMovementListOutput>;
}
