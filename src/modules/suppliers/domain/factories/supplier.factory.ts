import { Money } from "src/shared/value-objets/money.vo";
import { Supplier } from "../entity/supplier";
import { SupplierVariant } from "../entity/supplierVariant";
import { SupplierDocType } from "../object-values/supplier-doc-type";

export class SupplierFactory {
  static createSupplier(params: {
    supplierId?: string;
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
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    return Supplier.create(params);
  }

  static createSupplierVariant(params: {
    supplierId: string;
    variantId: string;
    supplierSku?: string;
    lastCost?: Money;
    leadTimeDays?: number;
  }) {
    return SupplierVariant.create(params);
  }
}
