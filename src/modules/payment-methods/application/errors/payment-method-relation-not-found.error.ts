import { PaymentMethodApplicationError } from "./payment-method-application.error";

export class PaymentMethodRelationNotFoundError extends PaymentMethodApplicationError {
  readonly code = "PAYMENT_METHODS_APPLICATION_NOT_FOUND";
  readonly identifier = "PAYMENT_METHOD_RELATION_NOT_FOUND";

  constructor() {
    super("Relacion no encontrada");
  }
}
