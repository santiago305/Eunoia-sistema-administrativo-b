import { InventoryApplicationError } from "./inventory-application.error";

export class DocumentItemNotFoundApplicationError extends InventoryApplicationError {
  readonly code = "INVENTORY_APPLICATION_NOT_FOUND";
  readonly identifier = "DOCUMENT_ITEM_NOT_FOUND";

  constructor() {
    super("Item no encontrado");
  }
}
