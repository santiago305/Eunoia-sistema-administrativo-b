export interface ItemOutput {
  id: string;
  docId: string;
  stockItemId: string;
  quantity: number;
  unitCost?: number | null;
  fromLocationId?: string; 
  toLocationId?: string;   
}

