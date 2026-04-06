import { CompanyMethod } from "../entity/company-method";
import { PaymentMethod } from "../entity/payment-method";
import { SupplierMethod } from "../entity/supplier-method";

export class PaymentMethodFactory {
  static create(params: { name: string; isActive?: boolean }) {
    return PaymentMethod.create(params);
  }

  static createCompanyMethod(params: {
    companyId: string;
    methodId: string;
    number?: string;
  }) {
    return CompanyMethod.create(params);
  }

  static createSupplierMethod(params: {
    supplierId: string;
    methodId: string;
    number?: string;
  }) {
    return SupplierMethod.create(params);
  }
}
