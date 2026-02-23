export interface CreateSupplierVariantInput {
  supplierId: string;
  variantId: string;
  supplierSku?: string;
  lastCost?: number;
  leadTimeDays?: number;
}
