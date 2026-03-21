export interface GetLedgerDailyTotalsInput {
  warehouseId?: string;
  stockItemId?: string;
  locationId?: string;
  from?: Date;
  to?: Date;
  docId?: string;
}
