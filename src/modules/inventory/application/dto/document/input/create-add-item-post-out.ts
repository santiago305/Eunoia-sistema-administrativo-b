import { DocType } from 'src/modules/inventory/domain/value-objects/doc-type';
import { ReferenceType } from 'src/modules/inventory/domain/value-objects/reference-type';

export interface CreateAddItemPostOutInput {
  docType: DocType;
  serieId: string;
  fromWarehouseId?: string;
  note?: string;
  createdBy?: string;
  items: Array<{
    itemId: string;
    quantity: number;
    fromLocationId?: string;
    toLocationId?: string;
    unitCost?: number | null;
  }>;
  toWarehouseId?: string;
  referenceId?: string;
  referenceType?: ReferenceType;
}
