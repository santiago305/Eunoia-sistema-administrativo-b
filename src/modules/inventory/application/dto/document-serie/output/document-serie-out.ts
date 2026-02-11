import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";

export interface DocumentSerieOutput {
  id: string;
  code: string;     
  name: string;
  docType: DocType;
  warehouseId: string;
  nextNumber: number; 
  isActive:boolean,
  createdAt: Date     
}