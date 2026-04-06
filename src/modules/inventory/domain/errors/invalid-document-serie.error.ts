import { InventoryDomainError } from "./inventory-domain.error";

export class InvalidDocumentSerieError extends InventoryDomainError {
  readonly code = "INVENTORY_DOMAIN_VALIDATION";
  readonly identifier = "INVALID_DOCUMENT_SERIE";

  constructor(message = "La serie de documento es invalida") {
    super(message);
  }
}
