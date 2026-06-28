import { CompanyPaymentAccount } from "../../domain/entity/company-payment-account";

export class CompanyPaymentAccountOutputMapper {
  static toOutput(account: CompanyPaymentAccount) {
    return {
      id: account.companyPaymentAccountId,
      companyId: account.companyId,
      type: account.type,
      name: account.name,
      bankName: account.bankName ?? null,
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
