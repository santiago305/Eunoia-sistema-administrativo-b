import { InvalidPaymentMethodNameError } from "../errors/invalid-payment-method-name.error";
import { PaymentMethodDomainService } from "../services/payment-method-domain.service";

export class PaymentMethod {
  private constructor(
    public readonly methodId: string | undefined,
    public readonly name: string,
    public readonly isActive: boolean = true,
  ) {}

  static create(params: { methodId?: string; name: string; isActive?: boolean }) {
    const name = PaymentMethodDomainService.normalizeName(params.name);
    if (!name) {
      throw new InvalidPaymentMethodNameError();
    }

    return new PaymentMethod(params.methodId, name, params.isActive ?? true);
  }

  rename(name: string) {
    return PaymentMethod.create({
      methodId: this.methodId,
      name,
      isActive: this.isActive,
    });
  }

  changeActiveState(isActive: boolean) {
    return PaymentMethod.create({
      methodId: this.methodId,
      name: this.name,
      isActive,
    });
  }
}
