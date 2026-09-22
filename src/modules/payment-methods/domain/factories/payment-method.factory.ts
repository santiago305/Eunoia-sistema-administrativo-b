import { CompanyMethod } from "../entity/company-method";
import { PaymentMethod } from "../entity/payment-method";
import type { CompanyMethodEvidencePolicy } from "../services/payment-method-voucher-policy";

export class PaymentMethodFactory {
  static create(params: { name: string; code?: string; isActive?: boolean; requiresVoucher?: boolean }) {
    return PaymentMethod.create(params);
  }

  static createCompanyMethod(params: {
    companyId: string;
    methodId: string;
    evidencePolicy?: CompanyMethodEvidencePolicy;
    enabled?: boolean;
  }) {
    return CompanyMethod.create(params);
  }

}
