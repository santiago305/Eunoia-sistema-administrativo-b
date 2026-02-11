import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";

export interface GetActiveDocumentSerieInput {
  docType?: DocType;
  warehouseId: string;
  isActive?:boolean;
}