import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { CompanyPaymentAccount } from "../entity/company-payment-account";

export const COMPANY_PAYMENT_ACCOUNT_REPOSITORY = Symbol("COMPANY_PAYMENT_ACCOUNT_REPOSITORY");

export interface CompanyPaymentAccountRepository {
  findById(id: string, tx?: TransactionContext): Promise<CompanyPaymentAccount | null>;
  listByCompany(
    companyId: string,
    options?: { includeSensitive?: boolean },
    tx?: TransactionContext,
  ): Promise<CompanyPaymentAccount[]>;
  findDuplicate(
    account: CompanyPaymentAccount,
    exceptId?: string,
    tx?: TransactionContext,
  ): Promise<CompanyPaymentAccount | null>;
  create(account: CompanyPaymentAccount, tx?: TransactionContext): Promise<CompanyPaymentAccount>;
  update(
    params: {
      id: string;
      type?: CompanyPaymentAccount["type"];
      usage?: CompanyPaymentAccount["usage"];
      name?: string;
      institutionName?: string | null;
      bankName?: string | null;
      accountNumber?: string | null;
      cci?: string | null;
      cardLastFour?: string | null;
      walletProvider?: string | null;
      walletName?: string | null;
      walletPhone?: string | null;
      holderName?: string | null;
      currency?: CompanyPaymentAccount["currency"];
      isDefault?: boolean;
    },
    tx?: TransactionContext,
  ): Promise<CompanyPaymentAccount | null>;
  setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
  clearDefaultForScope(
    companyId: string,
    currency: CompanyPaymentAccount["currency"],
    usage: CompanyPaymentAccount["usage"],
    exceptId?: string,
    tx?: TransactionContext,
  ): Promise<void>;
}
