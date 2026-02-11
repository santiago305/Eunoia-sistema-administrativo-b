import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";

export interface CreateDocumentInput {
  docType: DocType;
  serieId: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  referenceId?: string;
  referenceType?: string;
  note?: string;
  createdBy?: string;
}