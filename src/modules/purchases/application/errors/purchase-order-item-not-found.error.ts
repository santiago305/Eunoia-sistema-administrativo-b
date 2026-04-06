import { PurchasesApplicationError } from "./purchases-application.error";

export class PurchaseOrderItemNotFoundApplicationError extends PurchasesApplicationError {
  readonly code = "PURCHASES_APPLICATION_NOT_FOUND";
  readonly identifier = "PURCHASE_ORDER_ITEM_NOT_FOUND";

  constructor() {
    super("Item no encontrado");
  }
}
