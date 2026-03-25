export interface ItemOutput {
  id: string;
  docId: string;
  stockItemId: string;
  quantity: number;
  wasteQty?: number | null;
  unitCost?: number | null;
  fromLocationId?: string; 
  toLocationId?: string;   
}

