export interface AddItemInput {
  docId: string;
  variantId: string;
  quantity?: number;
  fromLocationId?: string;
  toLocationId?: string;
  unitCost?: number | null;
}