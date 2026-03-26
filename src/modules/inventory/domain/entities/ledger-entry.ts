import { Direction } from '../value-objects/direction';
import { ReferenceType } from '../value-objects/reference-type';

export type LedgerWarehouseSnapshot = {
  id: string;
  name: string;
  department: string;
  province: string;
  district: string;
  address?: string | null;
  isActive: boolean;
  createdAt: Date;
};

export type LedgerDocumentSnapshot = {
  id: string;
  docType: string;
  status: string;
  serieId: string;
  serie?: {
    id: string;
    code: string;
  } | null;
  correlative: number;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  fromWarehouse?: {
    id: string;
    name: string;
  } | null;
  toWarehouse?: {
    id: string;
    name: string;
  } | null;
  referenceId?: string;
  referenceType?: ReferenceType;
  createdBy?: {
    id:string,
    name:string
    email:string
  };
};

export type LedgerWarehouseRefSnapshot = {
  id: string;
  name: string;
  department: string;
  province: string;
  district: string;
  address?: string | null;
  isActive: boolean;
  createdAt: Date;
};

export type LedgerSupplierRefSnapshot = {
  id: string;
  documentType: string;
  documentNumber: string;
  name?: string | null;
  lastName?: string | null;
  tradeName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  note?: string | null;
  leadTimeDays?: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type LedgerUserRefSnapshot = {
  id: string;
  name: string;
  email: string;
};

export type LedgerPurchaseRefSnapshot = {
  id: string;
  supplierId: string;
  warehouseId: string;
  documentType?: string | null;
  serie?: string | null;
  correlative?: number | null;
  expectedAt?: Date | null;
  dateIssue?: Date | null;
  dateExpiration?: Date | null;
  createdAt: Date;
};

export type LedgerProductionRefSnapshot = {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  docType: string;
  serieId: string;
  serie?: string | null;
  correlative: number;
  status: string;
  reference?: string | null;
  manufactureDate: Date;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LedgerReferenceDocSnapshot =
  | {
      type: ReferenceType.PURCHASE;
      purchase: LedgerPurchaseRefSnapshot;
      supplier?: LedgerSupplierRefSnapshot;
      createdBy?: LedgerUserRefSnapshot;
    }
  | {
      type: ReferenceType.PRODUCTION;
      production: LedgerProductionRefSnapshot;
      createdBy?: LedgerUserRefSnapshot;
    };

export type LedgerProductSnapshot = {
  id: string;
  name: string;
  sku: string;
  unidad?: string;
};

export type LedgerVariantSnapshot = {
  id: string;
  productId: string;
  name?: string;
  sku: string;
  unidad?: string;
};

export type LedgerStockItemSnapshot = {
  id: string;
  type: string;
  productId?: string | null;
  variantId?: string | null;
  product?: LedgerProductSnapshot | null;
  variant?: LedgerVariantSnapshot | null;
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
    public readonly referenceDoc?: LedgerReferenceDocSnapshot,
    public readonly balance?: number,
  ) {}
}
