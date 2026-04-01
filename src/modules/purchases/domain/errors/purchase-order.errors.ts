import { DomainError } from "./domain.error";

export class PurchaseOrderNotFoundError extends DomainError {
  constructor(message: string = "Orden de compra no encontrada") {
    super(message);
    this.name = "PurchaseOrderNotFoundError";
  }
}

export class PurchaseOrderCreateFailedError extends DomainError {
  constructor(message: string = "No se pudo crear la orden de compra") {
    super(message);
    this.name = "PurchaseOrderCreateFailedError";
  }
}

export class PurchaseOrderStatusUpdateFailedError extends DomainError {
  constructor(message: string = "No se pudo actualizar estado") {
    super(message);
    this.name = "PurchaseOrderStatusUpdateFailedError";
  }
}

export class PurchaseOrderCannotCancelReceivedError extends DomainError {
  constructor(message: string = "No se puede cancelar una orden RECEIVED") {
    super(message);
    this.name = "PurchaseOrderCannotCancelReceivedError";
  }
}

export class PurchaseOrderAlreadyCancelledError extends DomainError {
  constructor(message: string = "Ya esta cancelada la orden") {
    super(message);
    this.name = "PurchaseOrderAlreadyCancelledError";
  }
}

export class PurchaseOrderExpectedAtMissingError extends DomainError {
  constructor(message: string = "La orden no tiene expectedAt") {
    super(message);
    this.name = "PurchaseOrderExpectedAtMissingError";
  }
}

export class PurchaseOrderInvalidStatusForSentError extends DomainError {
  constructor(message: string = "Estado invalido para pasar a SENT") {
    super(message);
    this.name = "PurchaseOrderInvalidStatusForSentError";
  }
}

export class PurchaseOrderInvalidStatusForExpectedRunError extends DomainError {
  constructor(message: string = "La orden no esta en estado SENT o PARTIAL") {
    super(message);
    this.name = "PurchaseOrderInvalidStatusForExpectedRunError";
  }
}

export class PurchaseOrderNoItemsError extends DomainError {
  constructor(message: string = "La orden no tiene items") {
    super(message);
    this.name = "PurchaseOrderNoItemsError";
  }
}

export class PurchaseOrderItemsAddFailedError extends DomainError {
  constructor(message: string = "No se pudo agregar items a la orden de compra") {
    super(message);
    this.name = "PurchaseOrderItemsAddFailedError";
  }
}

export class PurchaseOrderItemsRemoveFailedError extends DomainError {
  constructor(message: string = "No se pudo eliminar items de la orden de compra") {
    super(message);
    this.name = "PurchaseOrderItemsRemoveFailedError";
  }
}

export class PurchaseOrderPaymentsDeleteFailedError extends DomainError {
  constructor(message: string = "No se pudo eliminar pagos de la orden de compra") {
    super(message);
    this.name = "PurchaseOrderPaymentsDeleteFailedError";
  }
}

export class PurchaseOrderQuotasDeleteFailedError extends DomainError {
  constructor(message: string = "No se pudo eliminar cuotas de la orden de compra") {
    super(message);
    this.name = "PurchaseOrderQuotasDeleteFailedError";
  }
}

export class PurchaseOrderSerieNotFoundError extends DomainError {
  constructor(message: string = "No hay ninguna serie asociada") {
    super(message);
    this.name = "PurchaseOrderSerieNotFoundError";
  }
}

export class InvalidPurchaseOrderIdError extends DomainError {
  constructor(message: string = "Id de orden de compra invalido") {
    super(message);
    this.name = "InvalidPurchaseOrderIdError";
  }
}

export class InvalidPurchaseSupplierIdError extends DomainError {
  constructor(message: string = "Id de proveedor invalido") {
    super(message);
    this.name = "InvalidPurchaseSupplierIdError";
  }
}

export class InvalidPurchaseWarehouseIdError extends DomainError {
  constructor(message: string = "Id de almacen invalido") {
    super(message);
    this.name = "InvalidPurchaseWarehouseIdError";
  }
}

export class InvalidCreditDaysError extends DomainError {
  constructor(message: string = "Dias de credito invalidos") {
    super(message);
    this.name = "InvalidCreditDaysError";
  }
}

export class InvalidNumQuotasError extends DomainError {
  constructor(message: string = "Numero de cuotas invalido") {
    super(message);
    this.name = "InvalidNumQuotasError";
  }
}

export class InvalidPurchaseOrderDocumentError extends DomainError {
  constructor(message: string = "Documento de compra invalido") {
    super(message);
    this.name = "InvalidPurchaseOrderDocumentError";
  }
}

export class InvalidPurchaseSerieError extends DomainError {
  constructor(message: string = "Serie invalida") {
    super(message);
    this.name = "InvalidPurchaseSerieError";
  }
}

export class InvalidPurchaseCorrelativeError extends DomainError {
  constructor(message: string = "Correlativo invalido") {
    super(message);
    this.name = "InvalidPurchaseCorrelativeError";
  }
}

export class InvalidExpectedAtError extends DomainError {
  constructor(message: string = "Fecha esperada invalida") {
    super(message);
    this.name = "InvalidExpectedAtError";
  }
}

export class InvalidIssueDateError extends DomainError {
  constructor(message: string = "Fecha de emision invalida") {
    super(message);
    this.name = "InvalidIssueDateError";
  }
}

export class InvalidExpirationDateError extends DomainError {
  constructor(message: string = "Fecha de vencimiento invalida") {
    super(message);
    this.name = "InvalidExpirationDateError";
  }
}
