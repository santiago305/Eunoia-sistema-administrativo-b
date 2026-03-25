export interface UpdateProductionWasteItemInput {
  wasteQty: number;
  stockItemId?: string;
  locationId?: string | null;
  itemId?: string;
}

export interface UpdateProductionWasteInput {
  productionId: string;
  items: UpdateProductionWasteItemInput[];
}
