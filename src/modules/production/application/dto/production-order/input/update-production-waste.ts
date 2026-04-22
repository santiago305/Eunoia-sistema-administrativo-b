export interface UpdateProductionWasteItemInput {
  stockItemId: string;
  wasteQty: number;
  locationId?: string | null;
  itemId?: string;
}

export interface UpdateProductionWasteInput {
  productionId: string;
  items: UpdateProductionWasteItemInput[];
}
