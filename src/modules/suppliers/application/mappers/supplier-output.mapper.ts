import { Supplier } from "../../domain/entity/supplier";
import { SupplierSku } from "../../domain/entity/supplierSku";
import { SupplierOutput } from "../dtos/supplier/output/supplier.output";
import { SupplierSkuOutput } from "../dtos/supplier-sku/output/supplier-sku.output";

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

  static toSupplierSkuOutput(row: SupplierSku): SupplierSkuOutput {
    return {
      supplierId: row.supplierId,
      skuId: row.skuId,
      supplierSku: row.supplierSku,
      lastCost: row.lastCost?.getAmount(),
      leadTimeDays: row.leadTimeDays,
    };
  }
}
