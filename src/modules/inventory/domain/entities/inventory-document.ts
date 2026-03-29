import  { DocStatus } from '../value-objects/doc-status';
import { DocType } from '../value-objects/doc-type';
import  InventoryDocumentItem  from './inventory-document-item';
import { ReferenceType } from '../value-objects/reference-type';
import { ProductType } from 'src/modules/catalog/domain/value-object/productType';

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
