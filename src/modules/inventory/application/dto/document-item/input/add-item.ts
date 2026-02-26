export interface AddItemInput {
  docId: string;
  stockItemId: string;
  quantity?: number;
  fromLocationId?: string;
  toLocationId?: string;
  unitCost?: number | null;
}
