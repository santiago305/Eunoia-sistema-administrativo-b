import { InventoryApplicationError } from "./inventory-application.error";

export class DocumentNotFoundApplicationError extends InventoryApplicationError {
  readonly code = "INVENTORY_APPLICATION_NOT_FOUND";
  readonly identifier = "DOCUMENT_NOT_FOUND";

  constructor() {
    super("Documento no encontrado");
  }
}
