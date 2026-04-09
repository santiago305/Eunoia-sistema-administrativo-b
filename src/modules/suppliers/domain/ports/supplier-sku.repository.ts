import { Money } from "src/shared/value-objets/money.vo";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SupplierSku } from "../entity/supplierSku";

export const SUPPLIER_SKU_REPOSITORY = Symbol("SUPPLIER_SKU_REPOSITORY");

export interface SupplierSkuRepository {
  findById(supplierId: string, skuId: string, tx?: TransactionContext): Promise<SupplierSku | null>;
  create(row: SupplierSku, tx?: TransactionContext): Promise<SupplierSku | null>;
  update(
    params: {
      supplierId: string;
      skuId: string;
      supplierSku?: string;
      lastCost?: Money;
      leadTimeDays?: number;
    },
    tx?: TransactionContext,
  ): Promise<SupplierSku | null>;
  list(
    params: {
      supplierId?: string;
      skuId?: string;
      supplierSku?: string;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: SupplierSku[]; total: number }>;
}
