import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

export type SupplierPaymentDestinationType = "BANK_ACCOUNT" | "DIGITAL_WALLET" | "CARD" | "CASH";

export class SupplierPaymentDestinationValidationError extends Error {}

const digitsOnly = (value?: string | null) => value?.replace(/\D/g, "") || "";
const clean = (value?: string | null) => value?.trim() || null;
const lastFour = (value?: string | null) => {
  const digits = digitsOnly(value);
  return digits.length >= 4 ? digits.slice(-4) : null;
};

export class SupplierPaymentDestination {
  private constructor(
    public readonly id: string | undefined,
    public readonly supplierId: string,
    public readonly methodId: string,
    public readonly type: SupplierPaymentDestinationType,
    public readonly currency: CurrencyType,
    public readonly name: string,
    public readonly institutionName: string | null,
    public readonly providerName: string | null,
    public readonly accountNumber: string | null,
    public readonly accountLastFour: string | null,
    public readonly cci: string | null,
    public readonly cciLastFour: string | null,
    public readonly walletIdentifier: string | null,
    public readonly walletIdentifierLastFour: string | null,
    public readonly holderName: string | null,
    public readonly holderDocument: string | null,
    public readonly isActive: boolean,
    public readonly isDefault: boolean,
    public readonly requiresManualReview: boolean,
  ) {}

  static create(params: {
    id?: string;
    supplierId: string;
    methodId: string;
    type: SupplierPaymentDestinationType;
    currency: CurrencyType;
    name: string;
    institutionName?: string | null;
    providerName?: string | null;
    accountNumber?: string | null;
    accountLastFour?: string | null;
    cci?: string | null;
    cciLastFour?: string | null;
    walletIdentifier?: string | null;
    walletIdentifierLastFour?: string | null;
    holderName?: string | null;
    holderDocument?: string | null;
    isActive?: boolean;
    isDefault?: boolean;
    requiresManualReview?: boolean;
  }) {
    const name = clean(params.name);
    if (!params.supplierId || !params.methodId || !name) {
      throw new SupplierPaymentDestinationValidationError("Proveedor, método y nombre son obligatorios");
    }

    const accountNumber = clean(params.accountNumber);
    const cci = digitsOnly(params.cci) || null;
    const walletIdentifier = digitsOnly(params.walletIdentifier) || null;
    const institutionName = clean(params.institutionName);
    const providerName = clean(params.providerName);
    let accountLastFour = clean(params.accountLastFour) || lastFour(accountNumber);
    let cciLastFour = clean(params.cciLastFour) || lastFour(cci);
    let walletIdentifierLastFour = clean(params.walletIdentifierLastFour) || lastFour(walletIdentifier);

    if (params.type === "BANK_ACCOUNT") {
      if (!institutionName || (!accountNumber && !cci)) {
        throw new SupplierPaymentDestinationValidationError("El destino bancario requiere banco y cuenta o CCI");
      }
      if (cci && !/^\d{20}$/.test(cci)) {
        throw new SupplierPaymentDestinationValidationError("El CCI debe contener 20 dígitos");
      }
    } else if (params.type === "DIGITAL_WALLET") {
      if (!providerName || !/^\d{6,15}$/.test(walletIdentifier ?? "")) {
        throw new SupplierPaymentDestinationValidationError("La billetera requiere proveedor e identificador numérico");
      }
    } else if (params.type === "CARD" && !/^\d{4}$/.test(clean(params.accountLastFour) ?? accountLastFour ?? "")) {
      throw new SupplierPaymentDestinationValidationError("La tarjeta requiere los últimos cuatro dígitos");
    }

    const isActive = params.requiresManualReview ? false : (params.isActive ?? true);
    if (params.isDefault && !isActive) {
      throw new SupplierPaymentDestinationValidationError("Un destino inactivo o en revisión no puede ser predeterminado");
    }

    if (params.type !== "BANK_ACCOUNT") {
      accountLastFour = params.type === "CARD" ? accountLastFour : null;
      cciLastFour = null;
    }
    if (params.type !== "DIGITAL_WALLET") walletIdentifierLastFour = null;

    return new SupplierPaymentDestination(
      params.id,
      params.supplierId,
      params.methodId,
      params.type,
      params.currency,
      name,
      params.type === "BANK_ACCOUNT" ? institutionName : null,
      params.type === "DIGITAL_WALLET" ? providerName : null,
      params.type === "BANK_ACCOUNT" || params.type === "CARD" ? accountNumber : null,
      accountLastFour,
      params.type === "BANK_ACCOUNT" ? cci : null,
      cciLastFour,
      params.type === "DIGITAL_WALLET" ? walletIdentifier : null,
      walletIdentifierLastFour,
      clean(params.holderName),
      clean(params.holderDocument),
      isActive,
      params.isDefault ?? false,
      params.requiresManualReview ?? false,
    );
  }

  get maskedLabel() {
    const suffix = this.accountLastFour ?? this.cciLastFour ?? this.walletIdentifierLastFour;
    return suffix ? `${this.name} ****${suffix}` : this.name;
  }
}
