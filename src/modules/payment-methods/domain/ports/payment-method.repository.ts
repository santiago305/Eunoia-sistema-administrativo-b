import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentMethod } from "../entity/payment-method";
import type { CompanyMethodEvidencePolicy } from "../services/payment-method-voucher-policy";

export const PAYMENT_METHOD_REPOSITORY = Symbol("PAYMENT_METHOD_REPOSITORY");

export type ConfiguredPaymentMethod = {
  relationId?: string;
  method: PaymentMethod;
  isDefault?: boolean;
  requiresVoucher: boolean;
  evidencePolicy: CompanyMethodEvidencePolicy;
  enabled?: boolean;
};

export interface PaymentMethodRepository {
  findById(methodId: string, tx?: TransactionContext): Promise<PaymentMethod | null>;
  getByCompany(companyId: string, tx?: TransactionContext): Promise<ConfiguredPaymentMethod[]>;
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
      requiresVoucher?: boolean;
    },
    tx?: TransactionContext,
  ): Promise<PaymentMethod | null>;
  setActive(methodId: string, isActive: boolean, tx?: TransactionContext): Promise<PaymentMethod | null>;
}
