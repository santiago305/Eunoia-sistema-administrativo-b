import { PaymentMethod } from "../entity/payment-method";

export class PaymentMethodDomainService {
  static normalizeName(name: string) {
    return name.trim();
  }

  static canToggleState(method: PaymentMethod, isActive: boolean) {
    return method.isActive !== isActive;
  }
}
