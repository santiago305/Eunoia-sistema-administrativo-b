import { IncomeFilters } from "../../application/dtos/income-filter.input";
import { IncomeListOutput, IncomeSummaryOutput } from "../../application/dtos/income.output";

export const INCOME_QUERY_REPOSITORY = Symbol("INCOME_QUERY_REPOSITORY");

export interface IncomeQueryRepository {
  list(filters: IncomeFilters): Promise<IncomeListOutput>;
  getSummary(filters: IncomeFilters): Promise<IncomeSummaryOutput>;
}
