import type { CompanyPaymentAccountType } from "../entity/company-payment-account";

const COMPATIBLE_ACCOUNT_TYPES: Record<string, readonly CompanyPaymentAccountType[]> = {
  CASH: ["CASH"],
  BANK_TRANSFER: ["BANK_ACCOUNT"],
  BANK_DEPOSIT: ["BANK_ACCOUNT", "CASH"],
  CARD: ["CREDIT_CARD"],
  DIGITAL_WALLET: ["DIGITAL_WALLET"],
  CHECK: ["BANK_ACCOUNT"],
};

export const getCompatibleCompanyPaymentAccountTypes = (
  paymentMethodCode?: string | null,
): readonly CompanyPaymentAccountType[] =>
  COMPATIBLE_ACCOUNT_TYPES[(paymentMethodCode ?? "").trim().toUpperCase()] ?? [];

export const isCompanyPaymentAccountCompatible = (
  paymentMethodCode: string | null | undefined,
  accountType: CompanyPaymentAccountType,
): boolean => {
  const compatibleTypes = getCompatibleCompanyPaymentAccountTypes(paymentMethodCode);
  return compatibleTypes.length === 0 || compatibleTypes.includes(accountType);
};
