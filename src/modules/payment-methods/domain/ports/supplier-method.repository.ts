import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentMethod } from "../entity/payment-method";
import { SupplierMethod } from "../entity/supplier-method";

export const SUPPLIER_METHOD_REPOSITORY = Symbol("SUPPLIER_METHOD_REPOSITORY");

export type SupplierMethodWithMethod = {
  relation: SupplierMethod;
  method: PaymentMethod;
};

export interface SupplierMethodRepository {
  findById(supplierMethodId: string, tx?: TransactionContext): Promise<SupplierMethod | null>;
  findDetailById(
    supplierMethodId: string,
    tx?: TransactionContext,
  ): Promise<SupplierMethodWithMethod | null>;
  listBySupplier(supplierId: string, tx?: TransactionContext): Promise<SupplierMethodWithMethod[]>;
  findDuplicate(
    supplierId: string,
    methodId: string,
    number: string | null,
    tx?: TransactionContext,
  ): Promise<SupplierMethod | null>;
  create(method: SupplierMethod, tx?: TransactionContext): Promise<SupplierMethod>;
  update(
    params: {
      supplierMethodId: string;
      methodId?: string;
      number?: string | null;
    },
    tx?: TransactionContext,
  ): Promise<SupplierMethod | null>;
  delete(supplierMethodId: string, tx?: TransactionContext): Promise<boolean>;
}
