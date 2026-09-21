import { InvalidPaymentMethodNameError } from "../errors/invalid-payment-method-name.error";
import { PaymentMethodDomainService } from "../services/payment-method-domain.service";
import {
  getPaymentMethodDefinition,
  normalizePaymentMethodCode,
  PaymentMethodCategory,
  PaymentMethodCode,
} from "../value-objects/payment-method-catalog";

export class PaymentMethod {
  private constructor(
    public readonly methodId: string | undefined,
    public readonly name: string,
    public readonly isActive: boolean = true,
    public readonly requiresVoucher: boolean = true,
    public readonly code: PaymentMethodCode = "OTHER",
    public readonly category: PaymentMethodCategory = "OTHER",
    public readonly requiresSourceAccount: boolean = true,
    public readonly requiresDestination: boolean = false,
    public readonly requiresOperationReference: boolean = true,
    public readonly isSystem: boolean = false,
  ) {}

  static create(params: {
    methodId?: string;
    name: string;
    code?: string;
    isActive?: boolean;
    requiresVoucher?: boolean;
    category?: PaymentMethodCategory;
    requiresSourceAccount?: boolean;
    requiresDestination?: boolean;
    requiresOperationReference?: boolean;
    isSystem?: boolean;
  }) {
    const name = PaymentMethodDomainService.normalizeName(params.name);
    if (!name) {
      throw new InvalidPaymentMethodNameError();
    }

    const code = normalizePaymentMethodCode(params.code, name);
    const definition = getPaymentMethodDefinition(code, name);

    return new PaymentMethod(
      params.methodId,
      name,
      params.isActive ?? true,
      params.requiresVoucher ?? definition.requiresVoucher,
      code,
      params.category ?? definition.category,
      params.requiresSourceAccount ?? definition.requiresSourceAccount,
      params.requiresDestination ?? definition.requiresDestination,
      params.requiresOperationReference ?? definition.requiresOperationReference,
      params.isSystem ?? false,
    );
  }

  rename(name: string) {
    return PaymentMethod.create({
      methodId: this.methodId,
      name,
      isActive: this.isActive,
      requiresVoucher: this.requiresVoucher,
      code: this.code,
      category: this.category,
      requiresSourceAccount: this.requiresSourceAccount,
      requiresDestination: this.requiresDestination,
      requiresOperationReference: this.requiresOperationReference,
      isSystem: this.isSystem,
    });
  }

  changeActiveState(isActive: boolean) {
    return PaymentMethod.create({
      methodId: this.methodId,
      name: this.name,
      isActive,
      requiresVoucher: this.requiresVoucher,
      code: this.code,
      category: this.category,
      requiresSourceAccount: this.requiresSourceAccount,
      requiresDestination: this.requiresDestination,
      requiresOperationReference: this.requiresOperationReference,
      isSystem: this.isSystem,
    });
  }
}
