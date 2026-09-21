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
      usage: account.usage,
      name: account.name,
      institutionName: account.institutionName ?? null,
      bankName: account.bankName ?? null,
      accountNumber: options.includeSensitive ? account.accountNumber ?? null : null,
      accountLastFour: account.accountLastFour ?? null,
      cci: options.includeSensitive ? account.cci ?? null : null,
      cciLastFour: account.cciLastFour ?? null,
      cardLastFour: account.cardLastFour ?? null,
      walletProvider: account.walletProvider ?? null,
      walletName: account.walletName ?? null,
      walletPhone: options.includeSensitive ? account.walletPhone ?? null : null,
      walletPhoneLastFour: account.walletPhoneLastFour ?? null,
      holderName: account.holderName ?? null,
      currency: account.currency,
      isActive: account.isActive,
      isDefault: account.isDefault,
      maskedLabel: account.maskedLabel,
    };
  }
}
