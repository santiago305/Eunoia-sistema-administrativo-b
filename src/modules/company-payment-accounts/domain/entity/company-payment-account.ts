import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

export type CompanyPaymentAccountType = "BANK_ACCOUNT" | "CREDIT_CARD" | "CASH" | "DIGITAL_WALLET";
export type CompanyPaymentAccountUsage = "OUTFLOW" | "INFLOW" | "BOTH";

const digitsOnly = (value?: string | null) => value?.replace(/\D/g, "") || "";
const trimmed = (value?: string | null) => value?.trim() || null;
const lastFour = (value?: string | null) => {
  const digits = digitsOnly(value);
  return digits.length >= 4 ? digits.slice(-4) : null;
};

export class CompanyPaymentAccountValidationError extends Error {}

export class CompanyPaymentAccount {
  private constructor(
    public readonly companyPaymentAccountId: string | undefined,
    public readonly companyId: string,
    public readonly type: CompanyPaymentAccountType,
    public readonly usage: CompanyPaymentAccountUsage,
    public readonly name: string,
    public readonly currency: CurrencyType,
    public readonly isActive: boolean,
    public readonly isDefault: boolean,
    public readonly institutionName?: string | null,
    public readonly accountNumber?: string | null,
    public readonly accountLastFour?: string | null,
    public readonly cci?: string | null,
    public readonly cciLastFour?: string | null,
    public readonly walletProvider?: string | null,
    public readonly walletPhone?: string | null,
    public readonly walletPhoneLastFour?: string | null,
    public readonly cardLastFour?: string | null,
    public readonly holderName?: string | null,
  ) {}

  static create(params: {
    companyPaymentAccountId?: string;
    companyId: string;
    type: CompanyPaymentAccountType;
    usage?: CompanyPaymentAccountUsage;
    name: string;
    currency: CurrencyType;
    isActive?: boolean;
    isDefault?: boolean;
    institutionName?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    accountLastFour?: string | null;
    cci?: string | null;
    cciLastFour?: string | null;
    walletProvider?: string | null;
    walletName?: string | null;
    walletPhone?: string | null;
    walletPhoneLastFour?: string | null;
    cardLastFour?: string | null;
    holderName?: string | null;
    allowLegacyIncomplete?: boolean;
  }) {
    const companyId = params.companyId?.trim();
    const name = params.name?.trim();
    const usage = params.usage ?? "BOTH";
    const isActive = params.isActive ?? true;
    const isDefault = params.isDefault ?? false;
    if (!companyId || !name || !params.type || !params.currency) {
      throw new CompanyPaymentAccountValidationError("Datos de cuenta de tesoreria invalidos");
    }
    if (!(["OUTFLOW", "INFLOW", "BOTH"] as string[]).includes(usage)) {
      throw new CompanyPaymentAccountValidationError("El uso de la cuenta no es valido");
    }
    if (isDefault && !isActive) {
      throw new CompanyPaymentAccountValidationError("Una cuenta inactiva no puede ser predeterminada");
    }

    let institutionName = trimmed(params.institutionName ?? params.bankName);
    let accountNumber = trimmed(params.accountNumber);
    let accountLastFour = trimmed(params.accountLastFour) || lastFour(accountNumber);
    let cci = trimmed(params.cci);
    let cciLastFour = trimmed(params.cciLastFour) || lastFour(cci);
    let walletProvider = trimmed(params.walletProvider ?? params.walletName);
    let walletPhone = digitsOnly(params.walletPhone) || null;
    let walletPhoneLastFour = trimmed(params.walletPhoneLastFour) || lastFour(walletPhone);
    let cardLastFour = digitsOnly(params.cardLastFour) || null;
    let holderName = trimmed(params.holderName);

    if (params.type === "BANK_ACCOUNT") {
      if (!params.allowLegacyIncomplete && (!institutionName || (!accountNumber && !cci))) {
        throw new CompanyPaymentAccountValidationError(
          "La cuenta bancaria requiere institucion y numero de cuenta o CCI",
        );
      }
      if (cci && !/^\d{20}$/.test(cci)) {
        throw new CompanyPaymentAccountValidationError("El CCI debe contener 20 digitos");
      }
      cardLastFour = null;
      walletProvider = null;
      walletPhone = null;
      walletPhoneLastFour = null;
    } else if (params.type === "CREDIT_CARD") {
      if (!params.allowLegacyIncomplete && !/^\d{4}$/.test(cardLastFour ?? "")) {
        throw new CompanyPaymentAccountValidationError("La tarjeta requiere sus ultimos cuatro digitos");
      }
      accountNumber = null;
      accountLastFour = null;
      cci = null;
      cciLastFour = null;
      walletProvider = null;
      walletPhone = null;
      walletPhoneLastFour = null;
    } else if (params.type === "DIGITAL_WALLET") {
      if (!params.allowLegacyIncomplete && (!walletProvider || !/^\d{6,15}$/.test(walletPhone ?? ""))) {
        throw new CompanyPaymentAccountValidationError(
          "La billetera requiere proveedor y un identificador numerico valido",
        );
      }
      institutionName = null;
      accountNumber = null;
      accountLastFour = null;
      cci = null;
      cciLastFour = null;
      cardLastFour = null;
      holderName = null;
    } else {
      institutionName = null;
      accountNumber = null;
      accountLastFour = null;
      cci = null;
      cciLastFour = null;
      walletProvider = null;
      walletPhone = null;
      walletPhoneLastFour = null;
      cardLastFour = null;
      holderName = null;
    }

    return new CompanyPaymentAccount(
      params.companyPaymentAccountId,
      companyId,
      params.type,
      usage,
      name,
      params.currency,
      isActive,
      isDefault,
      institutionName,
      accountNumber,
      accountLastFour,
      cci,
      cciLastFour,
      walletProvider,
      walletPhone,
      walletPhoneLastFour,
      cardLastFour,
      holderName,
    );
  }

  get bankName() {
    return this.institutionName;
  }

  get walletName() {
    return this.walletProvider;
  }

  get maskedLabel() {
    const suffix = this.cardLastFour ?? this.accountLastFour ?? this.cciLastFour ?? this.walletPhoneLastFour;
    return suffix ? `${this.name} ****${suffix}` : this.name;
  }
}
