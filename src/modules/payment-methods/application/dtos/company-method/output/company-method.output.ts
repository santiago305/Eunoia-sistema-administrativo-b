import type { CompanyMethodEvidencePolicy } from "src/modules/payment-methods/domain/services/payment-method-voucher-policy";

export interface CompanyMethodOutput {
  companyMethodId: string;
  companyId: string;
  methodId: string;
  methodName: string;
  methodCode?: string;
  category?: string;
  isActive: boolean;
  requiresVoucher: boolean;
  evidencePolicy: CompanyMethodEvidencePolicy;
  enabled: boolean;
}
