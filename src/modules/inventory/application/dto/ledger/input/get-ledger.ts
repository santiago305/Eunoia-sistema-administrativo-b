export interface GetLedgerInput {
  warehouseId?: string;
  stockItemId?: string;
  locationId?: string;
  from?: Date;
  to?: Date;
  docId?: string;
  page?: number;
  limit?:number
}
