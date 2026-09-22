export const isCashPaymentMethodName = (name?: string | null) =>
  ["EFECTIVO", "CASH"].includes((name ?? "").trim().toUpperCase());

export const COMPANY_METHOD_EVIDENCE_POLICIES = ["INHERIT", "REQUIRED", "OPTIONAL"] as const;

export type CompanyMethodEvidencePolicy = (typeof COMPANY_METHOD_EVIDENCE_POLICIES)[number];

export const resolveRequiresVoucher = (
  methodName?: string | null,
  explicitValue?: boolean,
) => explicitValue ?? !isCashPaymentMethodName(methodName);

export const toCompanyMethodEvidencePolicy = (
  evidencePolicy?: CompanyMethodEvidencePolicy,
  legacyRequiresVoucher?: boolean,
): CompanyMethodEvidencePolicy => {
  if (evidencePolicy) return evidencePolicy;
  if (legacyRequiresVoucher === undefined) return "INHERIT";
  return legacyRequiresVoucher ? "REQUIRED" : "OPTIONAL";
};

export const resolveCompanyMethodRequiresVoucher = (
  methodRequiresVoucher: boolean,
  evidencePolicy: CompanyMethodEvidencePolicy = "INHERIT",
): boolean => {
  if (evidencePolicy === "REQUIRED") return true;
  if (evidencePolicy === "OPTIONAL") return false;
  return methodRequiresVoucher;
};
