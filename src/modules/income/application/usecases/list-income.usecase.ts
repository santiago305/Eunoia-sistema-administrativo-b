import { Inject } from "@nestjs/common";
import { IncomeFilterInput, normalizeIncomeFilters } from "../dtos/income-filter.input";
import { INCOME_QUERY_REPOSITORY, IncomeQueryRepository } from "../../domain/ports/income-query.repository";

export class ListIncomeUsecase {
  constructor(
    @Inject(INCOME_QUERY_REPOSITORY)
    private readonly repo: IncomeQueryRepository,
  ) {}

  execute(input: IncomeFilterInput = {}) {
    return this.repo.list(normalizeIncomeFilters(input));
  }
}
