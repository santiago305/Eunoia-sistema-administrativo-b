import type { CompanyMethodEvidencePolicy } from "src/modules/payment-methods/domain/services/payment-method-voucher-policy";

export interface UpdateCompanyMethodInput {
  companyMethodId: string;
  methodId?: string;
  requiresVoucher?: boolean;
  evidencePolicy?: CompanyMethodEvidencePolicy;
  enabled?: boolean;
}
