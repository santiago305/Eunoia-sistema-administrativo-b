import { CompanyPaymentAccount } from "../../domain/entity/company-payment-account";

export type CompanyPaymentAccountOutputOptions = {
  includeSensitive?: boolean;
};

export class CompanyPaymentAccountOutputMapper {
  static toOutput(account: CompanyPaymentAccount, options: CompanyPaymentAccountOutputOptions = {}) {
    return {
      id: account.companyPaymentAccountId,
      companyId: account.companyId,
      type: account.type,
      name: account.name,
      bankName: account.bankName ?? null,
      accountNumber: options.includeSensitive ? account.accountNumber ?? null : null,
      accountLastFour: account.accountLastFour ?? null,
      cardLastFour: account.cardLastFour ?? null,
      walletName: account.walletName ?? null,
      currency: account.currency,
      isActive: account.isActive,
      isDefault: account.isDefault,
      maskedLabel: account.maskedLabel,
    };
  }
}
