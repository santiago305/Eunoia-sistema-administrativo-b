export interface GetDemandSummaryInput {
  warehouseId?: string;
  stockItemId?: string;
  locationId?: string;
  from?: Date;
  to?: Date;
  windowDays?: number;
  horizonDays?: number;
}
