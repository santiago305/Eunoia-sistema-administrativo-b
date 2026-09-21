export const PAYMENT_METHOD_CODES = [
  "CASH",
  "BANK_TRANSFER",
  "BANK_DEPOSIT",
  "CARD",
  "DIGITAL_WALLET",
  "CHECK",
  "OTHER",
] as const;

export type PaymentMethodCode = (typeof PAYMENT_METHOD_CODES)[number];

export type PaymentMethodCategory =
  | "CASH"
  | "BANKING"
  | "CARD"
  | "DIGITAL_WALLET"
  | "CHECK"
  | "OTHER";

export type PaymentMethodDefinition = {
  code: PaymentMethodCode;
  category: PaymentMethodCategory;
  defaultName: string;
  requiresSourceAccount: boolean;
  requiresDestination: boolean;
  requiresOperationReference: boolean;
  requiresVoucher: boolean;
};

export const PAYMENT_METHOD_DEFINITIONS: Record<PaymentMethodCode, PaymentMethodDefinition> = {
  CASH: {
    code: "CASH",
    category: "CASH",
    defaultName: "Efectivo",
    requiresSourceAccount: true,
    requiresDestination: false,
    requiresOperationReference: false,
    requiresVoucher: false,
  },
  BANK_TRANSFER: {
    code: "BANK_TRANSFER",
    category: "BANKING",
    defaultName: "Transferencia bancaria",
    requiresSourceAccount: true,
    requiresDestination: true,
    requiresOperationReference: true,
    requiresVoucher: true,
  },
  BANK_DEPOSIT: {
    code: "BANK_DEPOSIT",
    category: "BANKING",
    defaultName: "Deposito bancario",
    requiresSourceAccount: true,
    requiresDestination: true,
    requiresOperationReference: true,
    requiresVoucher: true,
  },
  CARD: {
    code: "CARD",
    category: "CARD",
    defaultName: "Tarjeta",
    requiresSourceAccount: true,
    requiresDestination: false,
    requiresOperationReference: true,
    requiresVoucher: true,
  },
  DIGITAL_WALLET: {
    code: "DIGITAL_WALLET",
    category: "DIGITAL_WALLET",
    defaultName: "Billetera digital",
    requiresSourceAccount: true,
    requiresDestination: true,
    requiresOperationReference: true,
    requiresVoucher: true,
  },
  CHECK: {
    code: "CHECK",
    category: "CHECK",
    defaultName: "Cheque",
    requiresSourceAccount: true,
    requiresDestination: true,
    requiresOperationReference: true,
    requiresVoucher: true,
  },
  OTHER: {
    code: "OTHER",
    category: "OTHER",
    defaultName: "Otro",
    requiresSourceAccount: true,
    requiresDestination: false,
    requiresOperationReference: true,
    requiresVoucher: true,
  },
};

const LEGACY_NAME_TO_CODE: Record<string, PaymentMethodCode> = {
  EFECTIVO: "CASH",
  CASH: "CASH",
  TRANSFERENCIA: "BANK_TRANSFER",
  "TRANSFERENCIA BANCARIA": "BANK_TRANSFER",
  BANK_TRANSFER: "BANK_TRANSFER",
  BCP: "BANK_TRANSFER",
  BBVA: "BANK_TRANSFER",
  DEPOSITO: "BANK_DEPOSIT",
  BANK_DEPOSIT: "BANK_DEPOSIT",
  TARJETA: "CARD",
  CARD: "CARD",
  YAPE: "DIGITAL_WALLET",
  PLIN: "DIGITAL_WALLET",
  BILLETERA: "DIGITAL_WALLET",
  "BILLETERA DIGITAL": "DIGITAL_WALLET",
  DIGITAL_WALLET: "DIGITAL_WALLET",
  CHEQUE: "CHECK",
  CHECK: "CHECK",
  OTRO: "OTHER",
  OTHER: "OTHER",
};

export const normalizePaymentMethodCode = (
  code?: string | null,
  name?: string | null,
): PaymentMethodCode => {
  const normalizedCode = code?.trim().toUpperCase();
  if (normalizedCode && PAYMENT_METHOD_CODES.includes(normalizedCode as PaymentMethodCode)) {
    return normalizedCode as PaymentMethodCode;
  }

  const normalizedName = name?.trim().toUpperCase();
  return LEGACY_NAME_TO_CODE[normalizedName ?? ""] ?? "OTHER";
};

export const getPaymentMethodDefinition = (
  code?: string | null,
  name?: string | null,
): PaymentMethodDefinition => PAYMENT_METHOD_DEFINITIONS[normalizePaymentMethodCode(code, name)];
