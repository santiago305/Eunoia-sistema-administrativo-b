import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { SupplierMethod } from "../entity/supplier-method";

export const SUPPLIER_METHOD_REPOSITORY = Symbol("SUPPLIER_METHOD_REPOSITORY");

export interface SupplierMethodRepository {
  findById(supplierId: string, methodId: string, tx?: TransactionContext): Promise<SupplierMethod | null>;
  create(method: SupplierMethod, tx?: TransactionContext): Promise<SupplierMethod>;
  delete(supplierId: string, methodId: string, tx?: TransactionContext): Promise<boolean>;
}
