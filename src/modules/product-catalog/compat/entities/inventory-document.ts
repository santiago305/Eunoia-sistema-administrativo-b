import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ProductType } from "src/shared/domain/value-objects/product-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import InventoryDocumentItem from "./inventory-document-item";

export class InventoryDocument {
  constructor(
    public readonly id: string | undefined,
    public readonly docType: DocType,
    public status: DocStatus,
    public readonly serieId: string,
    public readonly correlative: number,
    public readonly fromWarehouseId?: string,
    public readonly toWarehouseId?: string,
    public readonly referenceId?: string,
    public readonly referenceType?: ReferenceType,
    public note?: string,
    public readonly createdBy?: string,
    public postedBy?: string,
    public postedAt?: Date,
    public readonly createdAt?: Date,
    public readonly productType?: ProductType,
    public items: InventoryDocumentItem[] = [],
  ) {}
}
