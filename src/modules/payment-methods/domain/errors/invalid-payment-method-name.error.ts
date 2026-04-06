import { PaymentMethodDomainError } from "./payment-method-domain.error";

export class InvalidPaymentMethodNameError extends PaymentMethodDomainError {
  readonly code = "PAYMENT_METHODS_DOMAIN_VALIDATION";
  readonly identifier = "PAYMENT_METHOD_NAME_INVALID";

  constructor() {
    super("El nombre del metodo de pago es invalido");
  }
}
