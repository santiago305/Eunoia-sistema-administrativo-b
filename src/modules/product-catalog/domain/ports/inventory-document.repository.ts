import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { DocStatus } from "src/shared/domain/value-objects/doc-status";
import { DocType } from "src/shared/domain/value-objects/doc-type";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";
import { ProductCatalogInventoryDocumentItem } from "../entities/inventory-document-item";
import { ProductCatalogInventoryDocument } from "../entities/inventory-document";
import { ProductCatalogProductType } from "../value-objects/product-type";

export const PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY = Symbol("PRODUCT_CATALOG_INVENTORY_DOCUMENT_REPOSITORY");

export interface ProductCatalogInventoryDocumentWarehouseRef {
  warehouseId: string;
  name: string | null;
}

export interface ProductCatalogInventoryDocumentUserRef {
  id: string;
  name: string | null;
  email: string | null;
}

export interface ProductCatalogInventoryDocumentListItem {
  id: string;
  docType: DocType;
  productType: ProductCatalogProductType | null;
  status: DocStatus;
  serieId: string | null;
  serie: string | null;
  serieCode: string | null;
  serieSeparator: string | null;
  seriePadding: number | null;
  correlative: number | null;
  fromWarehouseId: string | null;
  fromWarehouse: ProductCatalogInventoryDocumentWarehouseRef | null;
  fromWarehouseName: string | null;
  toWarehouseId: string | null;
  toWarehouse: ProductCatalogInventoryDocumentWarehouseRef | null;
  toWarehouseName: string | null;
  referenceId: string | null;
  referenceType: ReferenceType | null;
  note: string | null;
  createdById: string | null;
  createdBy: ProductCatalogInventoryDocumentUserRef | null;
  postedById: string | null;
  postedBy: ProductCatalogInventoryDocumentUserRef | null;
  postedAt: Date | null;
  createdAt: Date;
}

export interface ProductCatalogInventoryDocumentRepository {
  create(document: ProductCatalogInventoryDocument, tx?: TransactionContext): Promise<ProductCatalogInventoryDocument>;
  findById(id: string, tx?: TransactionContext): Promise<ProductCatalogInventoryDocument | null>;
  findByReference(input: { referenceType: ReferenceType; referenceId: string; docType?: string }, tx?: TransactionContext): Promise<ProductCatalogInventoryDocument[]>;
  list(
    params: {
      page: number;
      limit: number;
      from?: Date;
      toExclusive?: Date;
      docType?: DocType;
      productType?: ProductCatalogProductType;
      status?: DocStatus;
      warehouseIds?: string[];
      q?: string;
    },
    tx?: TransactionContext,
  ): Promise<{ items: ProductCatalogInventoryDocumentListItem[]; total: number; page: number; limit: number }>;
  listItems(docId: string, tx?: TransactionContext): Promise<ProductCatalogInventoryDocumentItem[]>;
  addItem(item: ProductCatalogInventoryDocumentItem, tx?: TransactionContext): Promise<ProductCatalogInventoryDocumentItem>;
  updateItem(input: { docId: string; itemId: string; quantity?: number; fromLocationId?: string | null; toLocationId?: string | null; unitCost?: number | null; wasteQty?: number | null }, tx?: TransactionContext): Promise<ProductCatalogInventoryDocumentItem | null>;
  markPosted(input: { docId: string; postedBy?: string | null; postedAt: Date }, tx?: TransactionContext): Promise<void>;
}
