import { CompanyMethodOutput } from "../dtos/company-method/output/company-method.output";
import { PaymentMethodOutput } from "../dtos/payment-method/output/payment-method.output";
import { SupplierMethodOutput } from "../dtos/supplier-method/output/supplier-method.output";
import { PaymentMethod } from "../../domain/entity/payment-method";
import { PaymentMethodWithNumber } from "../../domain/ports/payment-method.repository";
import { SupplierMethodWithMethod } from "../../domain/ports/supplier-method.repository";
import { CompanyMethodWithMethod } from "../../domain/ports/company-method.repository";

export class PaymentMethodOutputMapper {
  static toOutput(method: PaymentMethod): PaymentMethodOutput {
    return {
      methodId: method.methodId!,
      name: method.name,
      isActive: method.isActive,
    };
  }

  static toOutputWithNumber(item: PaymentMethodWithNumber): PaymentMethodOutput {
    return {
      methodId: item.method.methodId!,
      name: item.method.name,
      number: item.number ?? undefined,
      isActive: item.method.isActive,
    };
  }

  static toSupplierMethodOutput(item: SupplierMethodWithMethod): SupplierMethodOutput {
    return {
      supplierMethodId: item.relation.supplierMethodId!,
      supplierId: item.relation.supplierId,
      methodId: item.relation.methodId,
      methodName: item.method.name,
      number: item.relation.number,
      isActive: item.method.isActive,
    };
  }

  static toCompanyMethodOutput(item: CompanyMethodWithMethod): CompanyMethodOutput {
    return {
      companyMethodId: item.relation.companyMethodId!,
      companyId: item.relation.companyId,
      methodId: item.relation.methodId,
      methodName: item.method.name,
      number: item.relation.number,
      isActive: item.method.isActive,
    };
  }
}
