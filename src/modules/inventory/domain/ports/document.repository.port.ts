import { InventoryDocument } from '../entities/inventory-document';
import InventoryDocumentItem from '../entities/inventory-document-item';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { DocStatus } from '../value-objects/doc-status';
import { DocType } from '../value-objects/doc-type';

export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');

export interface DocumentRepository {
  createDraft(doc: InventoryDocument, tx?: TransactionContext): Promise<InventoryDocument>;
  findById(id: string, tx?: TransactionContext): Promise<InventoryDocument | null>;
  list(
    params: {
      status?: DocStatus;
      docType?: DocType;
      warehouseId?: string;
      from?: Date;
      to?: Date;
      page?:number;
      limit?:number;
    },
    tx?: TransactionContext,
  ): Promise<{
    items:InventoryDocument[];
    total:number;
    page:number;
    limit:number;
  }>;
  listItems(docId: string, tx?: TransactionContext): Promise<InventoryDocumentItem[]>;
  getByIdWithItems(
    docId: string,
    tx?: TransactionContext,
  ): Promise<{ doc: InventoryDocument; items: InventoryDocumentItem[] } | null>;
  addItem(item: InventoryDocumentItem, tx?: TransactionContext): Promise<InventoryDocumentItem>;
  updateItem(
    params: {
      docId: string;
      itemId: string;
      quantity?: number;
      fromLocationId?: string;
      toLocationId?: string;
      unitCost?: number | null;
    },
    tx?: TransactionContext,
  ): Promise<InventoryDocumentItem | null>;
  removeItem(docId: string, itemId: string, tx?: TransactionContext): Promise<boolean>;
  markPosted(
    params: {
      docId: string;
      postedBy?: string;
      note?:string,
      postedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<void>;
  markCancelled(params: {
      docId: string;
      postedBy?: string;
      note?:string,
      postedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<void>;
  existsBySerieId(
      serieId: string,
      params?: { excludeStatus?: DocStatus },
      tx?: TransactionContext,
  ): Promise<boolean>;

}
