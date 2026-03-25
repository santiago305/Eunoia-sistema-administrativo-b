export interface UpdateProductionWasteItemInput {
  stockItemId: string;
  wasteQty: number;
  locationId?: string | null;
  productionItemId?: string;
}

export interface UpdateProductionWasteInput {
  productionId: string;
  items: UpdateProductionWasteItemInput[];
}
