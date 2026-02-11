export interface GetLedgerInput {
  warehouseId?: string;
  variantId?: string;
  from?: Date;
  to?: Date;
  docId?: string;
  page?: number;
  limit?:number
}