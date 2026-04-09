export interface GetSalesTotalsInput {
  warehouseId?: string;
  stockItemId?: string;
  locationId?: string;
  from?: Date;
  to?: Date;
  docId?: string;
  month?: string;
}
