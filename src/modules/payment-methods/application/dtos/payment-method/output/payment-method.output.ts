import type { CompanyMethodEvidencePolicy } from "src/modules/payment-methods/domain/services/payment-method-voucher-policy";

export interface PaymentMethodOutput {
  methodId: string;
  name: string;
  code?: string;
  category?: string;
  requiresSourceAccount?: boolean;
  requiresDestination?: boolean;
  requiresOperationReference?: boolean;
  isSystem?: boolean;
  isActive: boolean;
  isDefault?: boolean;
  requiresVoucher: boolean;
  evidencePolicy?: CompanyMethodEvidencePolicy;
  enabled?: boolean;
}
