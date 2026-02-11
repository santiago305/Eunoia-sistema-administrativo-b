export interface UpdateItemInput {
  docId: string;
  itemId: string;
  quantity?: number;
  fromLocationId?: string;
  toLocationId?: string;
  unitCost?: number | null;
}