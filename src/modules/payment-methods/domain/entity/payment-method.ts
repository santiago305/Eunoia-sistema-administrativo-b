import { InvalidPaymentMethodNameError } from "../errors/invalid-payment-method-name.error";
import { PaymentMethodDomainService } from "../services/payment-method-domain.service";

export class PaymentMethod {
  private constructor(
    public readonly methodId: string | undefined,
    public readonly name: string,
    public readonly isActive: boolean = true,
    public readonly requiresVoucher: boolean = true,
  ) {}

  static create(params: { methodId?: string; name: string; isActive?: boolean; requiresVoucher?: boolean }) {
    const name = PaymentMethodDomainService.normalizeName(params.name);
    if (!name) {
      throw new InvalidPaymentMethodNameError();
    }

    return new PaymentMethod(params.methodId, name, params.isActive ?? true, params.requiresVoucher ?? true);
  }

  rename(name: string) {
    return PaymentMethod.create({
      methodId: this.methodId,
      name,
      isActive: this.isActive,
      requiresVoucher: this.requiresVoucher,
    });
  }

  changeActiveState(isActive: boolean) {
    return PaymentMethod.create({
      methodId: this.methodId,
      name: this.name,
      isActive,
      requiresVoucher: this.requiresVoucher,
    });
  }
}
