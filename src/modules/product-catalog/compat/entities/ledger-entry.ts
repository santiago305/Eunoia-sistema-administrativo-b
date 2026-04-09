import { Direction } from "src/shared/domain/value-objects/direction";
import { ReferenceType } from "src/shared/domain/value-objects/reference-type";

export type LedgerDocumentSnapshot = {
  id: string;
  docType: string;
  status: string;
  serieId: string;
  serie?: { id: string; code: string } | null;
  correlative: number;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  fromWarehouse?: { id: string; name: string } | null;
  toWarehouse?: { id: string; name: string } | null;
  referenceId?: string;
  referenceType?: ReferenceType;
  createdBy?: { id: string; name: string; email: string };
};

export type LedgerProductSnapshot = {
  id: string;
  name: string;
  sku: string;
  unidad?: string;
};

export type LedgerStockItemSnapshot = {
  id: string;
  type: string;
  productId?: string | null;
  product?: LedgerProductSnapshot | null;
};

export class LedgerEntry {
  constructor(
    public readonly id: string | undefined,
    public readonly docId: string,
    public readonly warehouseId: string,
    public readonly stockItemId: string,
    public readonly direction: Direction,
    public readonly quantity: number,
    public readonly unitCost?: number | null,
    public readonly docItemId?: string | null,
    public readonly wasteQty?: number | null,
    public readonly locationId?: string,
    public readonly createdAt?: Date,
    public readonly stockItem?: LedgerStockItemSnapshot,
    public readonly document?: LedgerDocumentSnapshot,
    public readonly referenceDoc?: unknown,
    public readonly balance?: number,
  ) {}
}
