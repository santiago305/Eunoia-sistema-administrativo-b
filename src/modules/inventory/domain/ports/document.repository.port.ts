import { InventoryDocument } from '../entities/inventory-document';
import InventoryDocumentItem from '../entities/inventory-document-item';
import { TransactionContext } from './unit-of-work.port';
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
    },
    tx?: TransactionContext,
  ): Promise<InventoryDocument[]>;
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
  removeItem(docId: string, itemId: string, tx?: TransactionContext): Promise<void>;
  markPosted(
    params: {
      docId: string;
      postedBy?: string;
      postedAt?: Date;
    },
    tx?: TransactionContext,
  ): Promise<void>;
  markCancelled(docId: string, tx?: TransactionContext): Promise<void>;
}
