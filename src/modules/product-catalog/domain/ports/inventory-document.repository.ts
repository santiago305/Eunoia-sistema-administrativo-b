import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { ProductCatalogInventoryDocumentItem } from "../entities/inventory-document-item";
import { ProductCatalogInventoryDocument } from "../entities/inventory-document";

export const PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY = Symbol("PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY");

export interface ProductCatalogInventoryDocumentRepository {
  create(document: ProductCatalogInventoryDocument, tx?: TransactionContext): Promise<ProductCatalogInventoryDocument>;
  findById(id: string, tx?: TransactionContext): Promise<ProductCatalogInventoryDocument | null>;
  findByReference(input: { referenceType: ReferenceType; referenceId: string; docType?: string }, tx?: TransactionContext): Promise<ProductCatalogInventoryDocument[]>;
  listItems(docId: string, tx?: TransactionContext): Promise<ProductCatalogInventoryDocumentItem[]>;
  addItem(item: ProductCatalogInventoryDocumentItem, tx?: TransactionContext): Promise<ProductCatalogInventoryDocumentItem>;
  updateItem(input: { docId: string; itemId: string; quantity?: number; fromLocationId?: string | null; toLocationId?: string | null; unitCost?: number | null; wasteQty?: number | null }, tx?: TransactionContext): Promise<ProductCatalogInventoryDocumentItem | null>;
  markPosted(input: { docId: string; postedBy?: string | null; postedAt: Date }, tx?: TransactionContext): Promise<void>;
}
