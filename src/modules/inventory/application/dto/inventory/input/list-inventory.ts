export interface ListInventoryInput {
  warehouseId?: string;
  stockItemId?: string;
  itemId?: string;
  locationId?: string;
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
}
