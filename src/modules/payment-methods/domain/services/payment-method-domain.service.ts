import { PaymentMethod } from "../entity/payment-method";
import { getPaymentMethodDefinition, normalizePaymentMethodCode } from "../value-objects/payment-method-catalog";

export class PaymentMethodDomainService {
  static normalizeName(name: string) {
    return name.trim().replace(/\s+/g, " ");
  }

  static canonicalName(name: string, code?: string | null, isSystem = false) {
    const resolvedCode = normalizePaymentMethodCode(code, name);
    return isSystem || resolvedCode !== "OTHER"
      ? getPaymentMethodDefinition(resolvedCode).defaultName
      : this.normalizeName(name);
  }

  static canToggleState(method: PaymentMethod, isActive: boolean) {
    return method.isActive !== isActive;
  }
}
