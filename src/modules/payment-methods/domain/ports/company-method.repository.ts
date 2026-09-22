import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PaymentMethod } from "../entity/payment-method";
import { CompanyMethod } from "../entity/company-method";
import type { CompanyMethodEvidencePolicy } from "../services/payment-method-voucher-policy";

export const COMPANY_METHOD_REPOSITORY = Symbol("COMPANY_METHOD_REPOSITORY");

export type CompanyMethodWithMethod = {
  relation: CompanyMethod;
  method: PaymentMethod;
};

export interface CompanyMethodRepository {
  findById(companyMethodId: string, tx?: TransactionContext): Promise<CompanyMethod | null>;
  findDetailById(
    companyMethodId: string,
    tx?: TransactionContext,
  ): Promise<CompanyMethodWithMethod | null>;
  listByCompany(companyId: string, tx?: TransactionContext): Promise<CompanyMethodWithMethod[]>;
  findDuplicate(
    companyId: string,
    methodId: string,
    tx?: TransactionContext,
  ): Promise<CompanyMethod | null>;
  create(method: CompanyMethod, tx?: TransactionContext): Promise<CompanyMethod>;
  update(
    params: {
      companyMethodId: string;
      methodId?: string;
      evidencePolicy?: CompanyMethodEvidencePolicy;
      enabled?: boolean;
    },
    tx?: TransactionContext,
  ): Promise<CompanyMethod | null>;
  delete(companyMethodId: string, tx?: TransactionContext): Promise<boolean>;
}
