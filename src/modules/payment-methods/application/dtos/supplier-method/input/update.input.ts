export interface UpdateSupplierMethodInput {
  supplierMethodId: string;
  methodId?: string;
  number?: string | null;
  isDefault?: boolean;
  requiresVoucher?: boolean;
}
