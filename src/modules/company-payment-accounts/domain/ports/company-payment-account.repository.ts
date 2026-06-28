import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { CompanyPaymentAccount } from "../entity/company-payment-account";

export const COMPANY_PAYMENT_ACCOUNT_REPOSITORY = Symbol("COMPANY_PAYMENT_ACCOUNT_REPOSITORY");

export interface CompanyPaymentAccountRepository {
  findById(id: string, tx?: TransactionContext): Promise<CompanyPaymentAccount | null>;
  listByCompany(companyId: string, tx?: TransactionContext): Promise<CompanyPaymentAccount[]>;
  findDuplicate(companyId: string, accountNumber: string, tx?: TransactionContext): Promise<CompanyPaymentAccount | null>;
  create(account: CompanyPaymentAccount, tx?: TransactionContext): Promise<CompanyPaymentAccount>;
  update(
    params: {
      id: string;
      type?: CompanyPaymentAccount["type"];
      name?: string;
      bankName?: string | null;
      accountNumber?: string | null;
      cardLastFour?: string | null;
      walletName?: string | null;
      currency?: CompanyPaymentAccount["currency"];
      isDefault?: boolean;
    },
    tx?: TransactionContext,
  ): Promise<CompanyPaymentAccount | null>;
  setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
  clearDefaultForCompany(companyId: string, exceptId?: string, tx?: TransactionContext): Promise<void>;
}
