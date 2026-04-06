import { InventoryApplicationError } from "./inventory-application.error";

export class StockItemAlreadyExistsApplicationError extends InventoryApplicationError {
  readonly code = "INVENTORY_APPLICATION_CONFLICT";
  readonly identifier = "STOCK_ITEM_ALREADY_EXISTS";

  constructor(context: "PRODUCT" | "VARIANT") {
    super(
      context === "PRODUCT"
        ? "Stock item para este producto ya existe"
        : "Stock item para esta variante ya existe",
    );
  }
}
