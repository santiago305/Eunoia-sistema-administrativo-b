import { PaymentsDomainError } from "./payments-domain.error";

export class InvalidCreditQuotaError extends PaymentsDomainError {
  readonly code = "PAYMENTS_DOMAIN_VALIDATION";
  readonly identifier = "CREDIT_QUOTA_INVALID";

  constructor(message = "La cuota de credito es invalida") {
    super(message);
  }
}
