import { PurchasesApplicationError } from "./purchases-application.error";

export class PurchaseOrderNotFoundApplicationError extends PurchasesApplicationError {
  readonly code = "PURCHASES_APPLICATION_NOT_FOUND";
  readonly identifier = "PURCHASE_ORDER_NOT_FOUND";

  constructor() {
    super("Orden de compra no encontrada");
  }
}
