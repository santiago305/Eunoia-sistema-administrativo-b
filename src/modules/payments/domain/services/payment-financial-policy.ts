import {
  getCompatibleCompanyPaymentAccountTypes,
  isCompanyPaymentAccountCompatible,
} from "src/modules/company-payment-accounts/domain/policies/payment-account-compatibility";

export type TreasuryAccountType =
  | "BANK_ACCOUNT"
  | "CREDIT_CARD"
  | "CASH"
  | "DIGITAL_WALLET";

export type PaymentMethodPolicy = {
  code: string;
  isActive: boolean;
  requiresSourceAccount: boolean;
  requiresDestination: boolean;
  requiresOperationReference: boolean;
  requiresVoucher: boolean;
};

export type PaymentPolicyInput = {
  method: PaymentMethodPolicy;
  account?: {
    id?: string | null;
    isActive: boolean;
    currency: string;
    usage: string;
    type: TreasuryAccountType;
  } | null;
  destination?: {
    id?: string | null;
    isActive: boolean;
    requiresManualReview: boolean;
    currency: string;
    methodId?: string | null;
  } | null;
  paymentMethodId?: string | null;
  currency: string;
  operationNumber?: string | null;
  hasEvidence?: boolean;
  validateEvidence?: boolean;
};

export class PaymentFinancialPolicyError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "PaymentFinancialPolicyError";
  }
}

/**
 * Single synchronous policy used by payment entry points after their adapters
 * resolve the method, treasury account and supplier destination records.
 * Persistence and transaction boundaries remain in application use cases.
 */
export class PaymentFinancialPolicy {
  static compatibleAccountTypes(methodCode?: string | null) {
    return getCompatibleCompanyPaymentAccountTypes(methodCode);
  }

  static validate(input: PaymentPolicyInput): void {
    const methodCode = input.method.code.trim().toUpperCase();

    if (!input.method.isActive) {
      throw new PaymentFinancialPolicyError(
        "METHOD_INACTIVE",
        "El metodo de pago no esta disponible",
      );
    }

    if (input.method.requiresSourceAccount && !input.account?.id) {
      throw new PaymentFinancialPolicyError(
        "SOURCE_ACCOUNT_REQUIRED",
        "Debe seleccionar una cuenta de origen",
      );
    }

    if (input.account) {
      if (!input.account.isActive) {
        throw new PaymentFinancialPolicyError(
          "SOURCE_ACCOUNT_INACTIVE",
          "La cuenta de origen no existe o esta inactiva",
        );
      }
      if (input.account.currency !== input.currency) {
        throw new PaymentFinancialPolicyError(
          "SOURCE_ACCOUNT_CURRENCY_MISMATCH",
          "La moneda del pago no coincide con la cuenta de origen",
        );
      }
      if (input.account.usage !== "OUTFLOW" && input.account.usage !== "BOTH") {
        throw new PaymentFinancialPolicyError(
          "SOURCE_ACCOUNT_USAGE_INVALID",
          "La cuenta seleccionada no permite salidas",
        );
      }
      if (!isCompanyPaymentAccountCompatible(methodCode, input.account.type)) {
        throw new PaymentFinancialPolicyError(
          "SOURCE_ACCOUNT_INCOMPATIBLE",
          "La cuenta de origen no es compatible con el metodo de pago",
        );
      }
    }

    if (input.method.requiresDestination && !input.destination?.id) {
      throw new PaymentFinancialPolicyError(
        "DESTINATION_REQUIRED",
        "Debe seleccionar el destino de pago del proveedor",
      );
    }

    if (input.destination) {
      if (!input.destination.isActive || input.destination.requiresManualReview) {
        throw new PaymentFinancialPolicyError(
          "DESTINATION_UNAVAILABLE",
          "El destino del proveedor no existe, esta inactivo o requiere revision",
        );
      }
      if (input.destination.currency !== input.currency) {
        throw new PaymentFinancialPolicyError(
          "DESTINATION_CURRENCY_MISMATCH",
          "La moneda del pago no coincide con el destino del proveedor",
        );
      }
      if (
        input.paymentMethodId &&
        input.destination.methodId &&
        input.destination.methodId !== input.paymentMethodId
      ) {
        throw new PaymentFinancialPolicyError(
          "DESTINATION_METHOD_MISMATCH",
          "El destino no es compatible con el metodo de pago",
        );
      }
    }

    if (input.method.requiresOperationReference && !input.operationNumber?.trim()) {
      throw new PaymentFinancialPolicyError(
        "OPERATION_REFERENCE_REQUIRED",
        "Ingresa la referencia exigida por el metodo",
      );
    }

    if (input.validateEvidence && input.method.requiresVoucher && !input.hasEvidence) {
      throw new PaymentFinancialPolicyError(
        "EVIDENCE_REQUIRED",
        "Adjunta la evidencia requerida por el metodo",
      );
    }
  }
}
