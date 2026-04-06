import { PaymentsDomainError } from "./payments-domain.error";

export class InvalidPaymentDocumentError extends PaymentsDomainError {
  readonly code = "PAYMENTS_DOMAIN_VALIDATION";
  readonly identifier = "PAYMENT_DOCUMENT_INVALID";

  constructor() {
    super("El documento de pago es invalido");
  }
}
