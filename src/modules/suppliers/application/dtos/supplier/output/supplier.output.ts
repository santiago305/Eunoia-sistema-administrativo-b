// src/modules/suppliers/application/dtos/supplier/output/supplier.output.ts
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";

export interface SupplierOutput {
  supplierId: string;
  documentType: SupplierDocType;
  documentNumber: string;
  name?: string;
  lastName?: string;
  tradeName?: string;
  address?: string;
  phone?: string;
  email?: string;
  note?: string;
  leadTimeDays?: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
