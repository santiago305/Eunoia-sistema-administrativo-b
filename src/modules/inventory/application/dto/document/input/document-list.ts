import { DocStatus } from "src/modules/inventory/domain/value-objects/doc-status";
import { DocType } from "src/modules/inventory/domain/value-objects/doc-type";
import { ProductType } from "src/modules/catalog/domain/value-object/productType";

export interface ListDocumentsInput {
  status?: DocStatus;
  docType?: DocType;
  productType?: ProductType;
  warehouseId?: string;
  from?: Date;
  to?: Date;
  page?:number;
  limit?:number;
}
