export interface UpdateSupplierVariantInput {
  supplierId: string;
  variantId: string;
  supplierSku?: string;
  lastCost?: number;
  leadTimeDays?: number;
}
