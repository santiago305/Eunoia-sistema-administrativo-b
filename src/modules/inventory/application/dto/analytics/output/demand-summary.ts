export interface DemandSummaryOutput {
  avgDaily: number;
  projection: number;
  coverageDays: number | null;
  totalOut: number;
  daysCount: number;
}
