import  { DocStatus } from '../value-objects/doc-status';
import { DocType } from '../value-objects/doc-type';
import  InventoryDocumentItem  from './inventory-document-item';

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
    public readonly referenceType?: string,
    public note?: string,
    public readonly createdBy?: string,
    public postedBy?: string,
    public postedAt?: Date,
    public readonly createdAt?: Date,
    public items: InventoryDocumentItem[] = [],
  ) {}

  addItem(item: InventoryDocumentItem) {
    this.items.push(item);
  }

  markPosted(postedBy: string, postedAt: Date) {
    this.status = DocStatus.POSTED;
    this.postedBy = postedBy;
    this.postedAt = postedAt;
  }

  isDraft() {
    return this.status === DocStatus.DRAFT;
  }
}
