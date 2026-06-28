export const isCashPaymentMethodName = (name?: string | null) =>
  (name ?? "").trim().toUpperCase() === "EFECTIVO";

export const resolveRequiresVoucher = (
  methodName?: string | null,
  explicitValue?: boolean,
) => explicitValue ?? !isCashPaymentMethodName(methodName);
