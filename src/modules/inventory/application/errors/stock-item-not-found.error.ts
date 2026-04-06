import { InventoryApplicationError } from "./inventory-application.error";

export class StockItemNotFoundApplicationError extends InventoryApplicationError {
  readonly code = "INVENTORY_APPLICATION_NOT_FOUND";
  readonly identifier = "STOCK_ITEM_NOT_FOUND";

  constructor() {
    super("Stock item no encontrado");
  }
}
