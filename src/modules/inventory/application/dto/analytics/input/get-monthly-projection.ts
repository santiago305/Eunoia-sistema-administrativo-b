export interface GetMonthlyProjectionInput {
  warehouseId?: string;
  stockItemId?: string;
  locationId?: string;
  to?: Date;
  months?: number;
}
