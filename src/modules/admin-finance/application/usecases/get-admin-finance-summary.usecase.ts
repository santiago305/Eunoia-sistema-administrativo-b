import { Inject, Injectable } from "@nestjs/common";
import { AdminFinanceFilterInput, normalizeAdminFinanceFilters } from "../dtos/admin-finance-filter.input";
import { AdminFinanceSummaryOutput } from "../dtos/admin-finance.output";
import {
  ADMIN_FINANCE_QUERY_REPOSITORY,
  AdminFinanceQueryRepository,
} from "../../domain/ports/admin-finance-query.repository";

@Injectable()
export class GetAdminFinanceSummaryUsecase {
  constructor(
    @Inject(ADMIN_FINANCE_QUERY_REPOSITORY)
    private readonly repo: AdminFinanceQueryRepository,
  ) {}

  execute(input: AdminFinanceFilterInput = {}): Promise<AdminFinanceSummaryOutput> {
    const { page: _page, limit: _limit, ...filters } =
      normalizeAdminFinanceFilters(input);
    return this.repo.getSummary(filters);
  }
}
