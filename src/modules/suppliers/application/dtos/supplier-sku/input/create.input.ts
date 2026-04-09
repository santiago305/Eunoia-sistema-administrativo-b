export interface CreateSupplierSkuInput {
  supplierId: string;
  skuId: string;
  supplierSku?: string;
  lastCost?: number;
  leadTimeDays?: number;
}
