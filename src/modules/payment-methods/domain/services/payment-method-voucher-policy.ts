export const isCashPaymentMethodName = (name?: string | null) =>
  ["EFECTIVO", "CASH"].includes((name ?? "").trim().toUpperCase());

export const resolveRequiresVoucher = (
  methodName?: string | null,
  explicitValue?: boolean,
) => explicitValue ?? !isCashPaymentMethodName(methodName);
