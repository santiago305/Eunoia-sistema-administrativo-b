import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";

export interface ListSuppliersInput {
  documentType?: SupplierDocType;
  documentNumber?: string;
  name?: string;
  lastName?: string;
  tradeName?: string;
  phone?: string;
  email?: string;
  q?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
