export interface ItemOutput {
  id: string;
  docId: string;
  variantId: string;
  quantity: number;
  unitCost?: number | null;
  fromLocationId?: string; 
  toLocationId?: string;   
}
