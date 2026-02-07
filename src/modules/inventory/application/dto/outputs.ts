import { DocStatus } from '../../domain/value-objects/doc-status';
import { DocType } from '../../domain/value-objects/doc-type';
import { Direction } from '../../domain/value-objects/direction';

export interface DocumentSerieOutput {
  id: string;
  code: string;     
  name: string;
  correlative: number;      
}

export interface DocumentOutput {
  id: string;
  docType: DocType;
  status: DocStatus;
  serie: string;
  correlative: number;
  createdAt?: Date;
}

export interface DocumentDetailOutput {
  doc: DocumentOutput;
  items: ItemOutput[];
}

export interface ItemOutput {
  id: string;
  docId: string;
  variantId: string;
  quantity: number;
  unitCost?: number | null;
}

export interface AvailabilityOutput {
  warehouseId: string;
  variantId: string;
  locationId?: string;
  onHand: number;
  reserved: number;
  available: number | null;
}

export interface InventorySnapshotOutput {
  warehouseId: string;
  variantId: string;
  locationId?: string;
  onHand: number;
  reserved: number;
  available: number | null;
}

export interface LedgerEntryOutput {
  id: number;
  docId: string;
  warehouseId: string;
  locationId?: string;
  variantId: string;
  direction: Direction;
  quantity: number;
  unitCost?: number | null;
  createdAt?: Date;
}
export interface DocumentSerieDetailOutput {
  id: string;
  code: string;
  name: string;
  docType: DocType;
  warehouseId: string;
  nextNumber: number;
  padding: number;
  separator: string;
  isActive: boolean;
  createdAt?: Date;
}
