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
