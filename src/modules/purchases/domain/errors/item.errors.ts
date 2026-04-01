import { DomainError } from "./domain.error";

export class PurchaseOrderIdRequiredError extends DomainError {
  constructor(message: string = "poId es requerido") {
    super(message);
    this.name = "PurchaseOrderIdRequiredError";
  }
}

export class PurchaseOrderItemAddFailedError extends DomainError {
  constructor(message: string = "No se pudo agregar el item") {
    super(message);
    this.name = "PurchaseOrderItemAddFailedError";
  }
}

export class PurchaseOrderItemNotFoundError extends DomainError {
  constructor(message: string = "Item no encontrado") {
    super(message);
    this.name = "PurchaseOrderItemNotFoundError";
  }
}

export class InvalidPurchaseOrderItemIdError extends DomainError {
  constructor(message: string = "Id de item de orden invalido") {
    super(message);
    this.name = "InvalidPurchaseOrderItemIdError";
  }
}

export class InvalidPurchaseStockItemIdError extends DomainError {
  constructor(message: string = "Id de item de stock invalido") {
    super(message);
    this.name = "InvalidPurchaseStockItemIdError";
  }
}

export class InvalidPurchaseQuantityError extends DomainError {
  constructor(message: string = "Cantidad invalida") {
    super(message);
    this.name = "InvalidPurchaseQuantityError";
  }
}

export class InvalidPurchaseFactorError extends DomainError {
  constructor(message: string = "Factor invalido") {
    super(message);
    this.name = "InvalidPurchaseFactorError";
  }
}

export class InvalidIgvPercentageError extends DomainError {
  constructor(message: string = "Porcentaje IGV invalido") {
    super(message);
    this.name = "InvalidIgvPercentageError";
  }
}

export class StockItemNotFoundError extends DomainError {
  constructor(message: string = "Item de stock no encontrado") {
    super(message);
    this.name = "StockItemNotFoundError";
  }
}

export class FinishedStockItemNotFoundError extends DomainError {
  constructor(message: string = "StockItem terminado no encontrado") {
    super(message);
    this.name = "FinishedStockItemNotFoundError";
  }
}

export class ProductNotFoundError extends DomainError {
  constructor(message: string = "Producto no encontrado") {
    super(message);
    this.name = "ProductNotFoundError";
  }
}

export class VariantNotFoundError extends DomainError {
  constructor(message: string = "Variante no encontrada") {
    super(message);
    this.name = "VariantNotFoundError";
  }
}
