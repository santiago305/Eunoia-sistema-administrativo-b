import { IncomeSearchSnapshot } from "../income-search-snapshot";

export interface SaveIncomeSearchMetricInput {
  userId: string;
  name: string;
  snapshot: IncomeSearchSnapshot;
}
