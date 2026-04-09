import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";

export class ProductCatalogInventoryDocument {
  constructor(
    public readonly id: string | undefined,
    public readonly docType: DocType,
    public readonly status: DocStatus,
    public readonly serieId: string | null,
    public readonly correlative: number | null,
    public readonly fromWarehouseId: string | null,
    public readonly toWarehouseId: string | null,
    public readonly referenceId: string | null,
    public readonly referenceType: ReferenceType | null,
    public readonly note: string | null,
    public readonly createdBy: string | null,
    public readonly postedBy: string | null,
    public readonly postedAt: Date | null,
    public readonly createdAt?: Date,
  ) {}
}

