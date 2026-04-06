import { PaymentsApplicationError } from "./payments-application.error";

export class CreditQuotaNotFoundError extends PaymentsApplicationError {
  readonly code = "PAYMENTS_APPLICATION_NOT_FOUND";
  readonly identifier = "CREDIT_QUOTA_NOT_FOUND";

  constructor() {
    super("Cuota no encontrada");
  }
}
