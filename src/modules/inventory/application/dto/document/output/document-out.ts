import { DocStatus } from "src/modules/inventory/domain/value-objects/doc-status";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";

export interface DocumentOutput {
  id: string;
  docType: DocType;
  status: DocStatus;
  serie: string;
  correlative: number;
  createdAt?: Date;
}