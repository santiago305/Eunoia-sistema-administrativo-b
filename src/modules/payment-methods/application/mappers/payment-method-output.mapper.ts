import { CompanyMethodOutput } from "../dtos/company-method/output/company-method.output";
import { PaymentMethodOutput } from "../dtos/payment-method/output/payment-method.output";
import { PaymentMethod } from "../../domain/entity/payment-method";
import { ConfiguredPaymentMethod } from "../../domain/ports/payment-method.repository";
import { CompanyMethodWithMethod } from "../../domain/ports/company-method.repository";

export class PaymentMethodOutputMapper {
  static toOutput(method: PaymentMethod): PaymentMethodOutput {
    return {
      methodId: method.methodId!,
      name: method.name,
      code: method.code,
      category: method.category,
      requiresSourceAccount: method.requiresSourceAccount,
      requiresDestination: method.requiresDestination,
      requiresOperationReference: method.requiresOperationReference,
      isSystem: method.isSystem,
      isActive: method.isActive,
      requiresVoucher: method.requiresVoucher,
    };
  }

  static toConfiguredOutput(item: ConfiguredPaymentMethod): PaymentMethodOutput {
    return {
      methodId: item.method.methodId!,
      name: item.method.name,
      code: item.method.code,
      category: item.method.category,
      requiresSourceAccount: item.method.requiresSourceAccount,
      requiresDestination: item.method.requiresDestination,
      requiresOperationReference: item.method.requiresOperationReference,
      isSystem: item.method.isSystem,
      enabled: item.enabled ?? true,
      isActive: item.method.isActive,
      isDefault: item.isDefault ?? false,
      requiresVoucher: item.requiresVoucher,
    };
  }

  static toCompanyMethodOutput(item: CompanyMethodWithMethod): CompanyMethodOutput {
    return {
      companyMethodId: item.relation.companyMethodId!,
      companyId: item.relation.companyId,
      methodId: item.relation.methodId,
      methodName: item.method.name,
      methodCode: item.method.code,
      category: item.method.category,
      isActive: item.method.isActive,
      requiresVoucher: item.relation.requiresVoucher,
      enabled: item.relation.enabled,
    };
  }
}
