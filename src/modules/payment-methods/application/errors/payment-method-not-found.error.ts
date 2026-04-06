import { PaymentMethodApplicationError } from "./payment-method-application.error";

export class PaymentMethodNotFoundError extends PaymentMethodApplicationError {
  readonly code = "PAYMENT_METHODS_APPLICATION_NOT_FOUND";
  readonly identifier = "PAYMENT_METHOD_NOT_FOUND";

  constructor() {
    super("Metodo de pago no encontrado");
  }
}
