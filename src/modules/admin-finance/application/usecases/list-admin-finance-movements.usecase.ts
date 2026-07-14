import { Inject, Injectable } from "@nestjs/common";
import { AdminFinanceFilterInput, normalizeAdminFinanceFilters } from "../dtos/admin-finance-filter.input";
import { AdminFinanceMovementListOutput } from "../dtos/admin-finance.output";
import {
  ADMIN_FINANCE_QUERY_REPOSITORY,
  AdminFinanceQueryRepository,
} from "../../domain/ports/admin-finance-query.repository";

@Injectable()
export class ListAdminFinanceMovementsUsecase {
  constructor(
    @Inject(ADMIN_FINANCE_QUERY_REPOSITORY)
    private readonly repo: AdminFinanceQueryRepository,
  ) {}

  execute(input: AdminFinanceFilterInput = {}): Promise<AdminFinanceMovementListOutput> {
    return this.repo.listMovements(normalizeAdminFinanceFilters(input));
  }
}
