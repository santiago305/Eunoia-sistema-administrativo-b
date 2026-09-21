import { CompanyMethod } from "../entity/company-method";
import { PaymentMethod } from "../entity/payment-method";

export class PaymentMethodFactory {
  static create(params: { name: string; code?: string; isActive?: boolean; requiresVoucher?: boolean }) {
    return PaymentMethod.create(params);
  }

  static createCompanyMethod(params: {
    companyId: string;
    methodId: string;
    requiresVoucher?: boolean;
    enabled?: boolean;
  }) {
    return CompanyMethod.create(params);
  }

}
