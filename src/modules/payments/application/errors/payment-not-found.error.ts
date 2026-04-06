import { PaymentsApplicationError } from "./payments-application.error";

export class PaymentNotFoundError extends PaymentsApplicationError {
  readonly code = "PAYMENTS_APPLICATION_NOT_FOUND";
  readonly identifier = "PAYMENT_NOT_FOUND";

  constructor() {
    super("Pago no encontrado");
  }
}
