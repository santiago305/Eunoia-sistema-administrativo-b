import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

export type CompanyPaymentAccountType = "BANK_ACCOUNT" | "CREDIT_CARD" | "CASH" | "DIGITAL_WALLET";

const lastFour = (value?: string | null) => {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 4 ? digits.slice(-4) : null;
};

export class CompanyPaymentAccount {
  private constructor(
    public readonly companyPaymentAccountId: string | undefined,
    public readonly companyId: string,
    public readonly type: CompanyPaymentAccountType,
    public readonly name: string,
    public readonly currency: CurrencyType,
    public readonly isActive: boolean,
    public readonly bankName?: string | null,
    public readonly accountNumber?: string | null,
    public readonly accountLastFour?: string | null,
    public readonly cardLastFour?: string | null,
    public readonly walletName?: string | null,
  ) {}

  static create(params: {
    companyPaymentAccountId?: string;
    companyId: string;
    type: CompanyPaymentAccountType;
    name: string;
    currency: CurrencyType;
    isActive?: boolean;
    bankName?: string | null;
    accountNumber?: string | null;
    accountLastFour?: string | null;
    cardLastFour?: string | null;
    walletName?: string | null;
  }) {
    const companyId = params.companyId?.trim();
    const name = params.name?.trim();
    if (!companyId || !name || !params.type || !params.currency) {
      throw new Error("Datos de cuenta de pago invalidos");
    }

    const accountNumber = params.accountNumber?.trim() || null;
    const accountLastFour = params.accountLastFour?.trim() || lastFour(accountNumber);
    const cardLastFour = params.cardLastFour?.replace(/\D/g, "").slice(-4) || null;

    return new CompanyPaymentAccount(
      params.companyPaymentAccountId,
      companyId,
      params.type,
      name,
      params.currency,
      params.isActive ?? true,
      params.bankName?.trim() || null,
      accountNumber,
      accountLastFour,
      cardLastFour,
      params.walletName?.trim() || null,
    );
  }

  get maskedLabel() {
    const suffix = this.cardLastFour ?? this.accountLastFour;
    return suffix ? `${this.name} ****${suffix}` : this.name;
  }
}
