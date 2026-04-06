import { PaymentMethodDomainError } from "./payment-method-domain.error";

export class InvalidPaymentMethodRelationError extends PaymentMethodDomainError {
  readonly code = "PAYMENT_METHODS_DOMAIN_VALIDATION";
  readonly identifier = "PAYMENT_METHOD_RELATION_INVALID";

  constructor(context: "company" | "supplier") {
    super(`La relacion de metodo de pago para ${context} es invalida`);
  }
}
