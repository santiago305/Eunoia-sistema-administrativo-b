import { InventoryApplicationError } from "./inventory-application.error";

export class DocumentSerieNotFoundApplicationError extends InventoryApplicationError {
  readonly code = "INVENTORY_APPLICATION_NOT_FOUND";
  readonly identifier = "DOCUMENT_SERIE_NOT_FOUND";

  constructor() {
    super("Serie no encontrada");
  }
}
