import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";
import { ReferenceType } from "src/modules/inventory/domain/value-objects/reference-type";

export interface CreateDocumentInput {
  docType: DocType;
  serieId: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  referenceId?: string;
  referenceType?: ReferenceType;
  note?: string;
  createdBy?: string;
}
