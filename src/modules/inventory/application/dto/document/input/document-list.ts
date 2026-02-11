import { DocStatus } from "src/modules/inventory/domain/value-objects/doc-status";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";

export interface ListDocumentsInput {
  status?: DocStatus;
  docType?: DocType;
  warehouseId?: string;
  from?: Date;
  to?: Date;
  page?:number;
  limit?:number;
}
