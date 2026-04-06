import { Supplier } from "../../domain/entity/supplier";
import { SupplierVariant } from "../../domain/entity/supplierVariant";
import { SupplierOutput } from "../dtos/supplier/output/supplier.output";
import { SupplierVariantOutput } from "../dtos/supplier-variant/output/supplier-variant.output";

export class SupplierOutputMapper {
  static toSupplierOutput(supplier: Supplier): SupplierOutput {
    return {
      supplierId: supplier.supplierId,
      documentType: supplier.documentType,
      documentNumber: supplier.documentNumber,
      name: supplier.name,
      lastName: supplier.lastName,
      tradeName: supplier.tradeName,
      address: supplier.address,
      phone: supplier.phone,
      email: supplier.email,
      note: supplier.note,
      leadTimeDays: supplier.leadTimeDays,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }

  static toSupplierVariantOutput(row: SupplierVariant): SupplierVariantOutput {
    return {
      supplierId: row.supplierId,
      variantId: row.variantId,
      supplierSku: row.supplierSku,
      lastCost: row.lastCost?.getAmount(),
      leadTimeDays: row.leadTimeDays,
    };
  }
}
