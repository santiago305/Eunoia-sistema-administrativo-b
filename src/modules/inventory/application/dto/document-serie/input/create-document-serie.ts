import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";

export interface CreateDocumentSerieInput {
  code: string;
  name: string;
  docType: DocType;
  warehouseId: string;
  nextNumber?: number;
  padding?: number;
  separator?: string;
  isActive?: boolean;
  createAt?: Date;
}