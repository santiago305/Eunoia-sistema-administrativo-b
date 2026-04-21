import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";
import { SupplierSearchRule } from "../../supplier-search/supplier-search-snapshot";

export interface ListSuppliersInput {
  documentType?: SupplierDocType;
  documentNumber?: string;
  name?: string;
  lastName?: string;
  tradeName?: string;
  phone?: string;
  email?: string;
  q?: string;
  filters?: SupplierSearchRule[];
  requestedBy?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
