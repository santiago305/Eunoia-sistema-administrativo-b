import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentMethod } from "../entity/payment-method";

export const PAYMENT_METHOD_REPOSITORY = Symbol("PAYMENT_METHOD_REPOSITORY");

export type PaymentMethodWithNumber = {
  relationId?: string;
  method: PaymentMethod;
  number?: string | null;
};

export interface PaymentMethodRepository {
  findById(methodId: string, tx?: TransactionContext): Promise<PaymentMethod | null>;
  getByCompany(companyId: string, tx?: TransactionContext): Promise<PaymentMethodWithNumber[]>;
  getBySupplier(supplierId: string, tx?: TransactionContext): Promise<PaymentMethodWithNumber[]>;
  getRecords(tx?: TransactionContext): Promise<PaymentMethod[]>;
  list(
    params: { name?: string; isActive?: boolean; page: number; limit: number },
    tx?: TransactionContext,
  ): Promise<{ items: PaymentMethod[]; total: number }>;
  create(method: PaymentMethod, tx?: TransactionContext): Promise<PaymentMethod>;
  update(
    params: {
      methodId: string;
      name?: string;
    },
    tx?: TransactionContext,
  ): Promise<PaymentMethod | null>;
  setActive(methodId: string, isActive: boolean, tx?: TransactionContext): Promise<PaymentMethod | null>;
}
