import { DomainError } from "./domain.error";

export class InvalidPaymentAmountError extends DomainError {
  constructor(message: string = "Monto invalido") {
    super(message);
    this.name = "InvalidPaymentAmountError";
  }
}

export class InvalidPaymentDateError extends DomainError {
  constructor(message: string = "Fecha invalida") {
    super(message);
    this.name = "InvalidPaymentDateError";
  }
}

export class PaymentDocumentCreateFailedError extends DomainError {
  constructor(message: string = "No se pudo crear el documento de pago") {
    super(message);
    this.name = "PaymentDocumentCreateFailedError";
  }
}

export class CreditQuotaNotFoundError extends DomainError {
  constructor(message: string = "Cuota no encontrada") {
    super(message);
    this.name = "CreditQuotaNotFoundError";
  }
}

export class CreditQuotaWithoutPurchaseOrderError extends DomainError {
  constructor(message: string = "La cuota no tiene orden de compra asociada") {
    super(message);
    this.name = "CreditQuotaWithoutPurchaseOrderError";
  }
}

export class CreditQuotaNotBelongsToPurchaseOrderError extends DomainError {
  constructor(message: string = "La cuota no pertenece a la orden de compra indicada") {
    super(message);
    this.name = "CreditQuotaNotBelongsToPurchaseOrderError";
  }
}

export class QuotasRequiredError extends DomainError {
  constructor(message: string = "Debe registrar al menos una cuota") {
    super(message);
    this.name = "QuotasRequiredError";
  }
}

export class QuotaTotalPaidExceedsTotalError extends DomainError {
  constructor(message: string = "El total pagado no puede ser mayor al total a pagar") {
    super(message);
    this.name = "QuotaTotalPaidExceedsTotalError";
  }
}

export class InvalidQuotaExpirationDateError extends DomainError {
  constructor(message: string = "Fecha de expiracion invalida") {
    super(message);
    this.name = "InvalidQuotaExpirationDateError";
  }
}

export class InvalidQuotaPaymentDateError extends DomainError {
  constructor(message: string = "Fecha de pago invalida") {
    super(message);
    this.name = "InvalidQuotaPaymentDateError";
  }
}

export class CreditQuotaCreateFailedError extends DomainError {
  constructor(message: string = "No se pudo crear la cuota") {
    super(message);
    this.name = "CreditQuotaCreateFailedError";
  }
}
