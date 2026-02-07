import { DocType } from '../../domain/value-objects/doc-type';
import { DocStatus } from '../../domain/value-objects/doc-status';

export interface CreateDocumentInput {
  docType: DocType;
  serieId: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  referenceId?: string;
  referenceType?: string;
  note?: string;
  createdBy?: string;
}

export interface AddItemInput {
  docId: string;
  variantId: string;
  quantity?: number;
  fromLocationId?: string;
  toLocationId?: string;
  unitCost?: number | null;
}

export interface UpdateItemInput {
  docId: string;
  itemId: string;
  quantity?: number;
  fromLocationId?: string;
  toLocationId?: string;
  unitCost?: number | null;
}

export interface RemoveItemInput {
  docId: string;
  itemId: string;
}

export interface CancelDocumentInput {
  docId: string;
}

export interface PostDocumentInput {
  docId: string;
  postedBy: string;
}

export interface GetAvailabilityInput {
  warehouseId: string;
  variantId: string;
  locationId?: string;
}

export interface GetLedgerInput {
  warehouseId?: string;
  variantId?: string;
  from?: Date;
  to?: Date;
  docId?: string;
}

export interface ListInventoryInput {
  warehouseId?: string;
  variantId?: string;
  locationId?: string;
}

export interface ListDocumentsInput {
  status?: DocStatus;
  docType?: DocType;
  warehouseId?: string;
  from?: Date;
  to?: Date;
}

export interface GetDocumentInput {
  docId: string;
}

export interface ListDocumentItemsInput {
  docId: string;
}

export interface CreateDocumentSerieInput {
  code: string;
  name: string;
  docType: DocType;
  warehouseId: string;
  nextNumber?: number;
  padding?: number;
  separator?: string;
  isActive?: boolean;
}

export interface GetDocumentSerieInput {
  id: string;
}

export interface GetActiveDocumentSerieInput {
  docType: DocType;
  warehouseId: string;
}
