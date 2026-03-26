import { DocType } from 'src/modules/inventory/domain/value-objects/doc-type';
import { ReferenceType } from 'src/modules/inventory/domain/value-objects/reference-type';

export interface CreateAddItemPostTransferInput {
  docType: DocType;
  serieId: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  note?: string;
  createdBy?: string;
  items: Array<{
    itemId?: string;
    stockItemId?: string;
    quantity: number;
    fromLocationId?: string;
    toLocationId?: string;
    unitCost?: number | null;
  }>;
  referenceId?: string;
  referenceType?: ReferenceType;
}
