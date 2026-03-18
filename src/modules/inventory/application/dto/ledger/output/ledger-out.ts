import { Direction } from "src/modules/inventory/domain/value-objects/direction";
import { ReferenceType } from "src/modules/inventory/domain/value-objects/reference-type";

export interface LedgerEntryOutput {
  id: string;
  docId: string;
  document?: {
    id: string;
    docType: string;
    status: string;
    serieId: string;
    correlative: number;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    referenceId?: string;
    referenceType?: ReferenceType;
    note?: string;
    createdBy?: string;
    postedBy?: string;
    postedAt?: Date;
    createdAt?: Date;
  };
  referenceDoc?:
    | {
        type: ReferenceType.PURCHASE;
        purchase: {
          id: string;
          supplierId: string;
          warehouseId: string;
          documentType?: string | null;
          serie?: string | null;
          correlative?: number | null;
          currency?: string | null;
          paymentForm?: string | null;
          creditDays: number;
          numQuotas: number;
          totalTaxed: number;
          totalExempted: number;
          totalIgv: number;
          purchaseValue: number;
          total: number;
          note?: string | null;
          status: string;
          isActive: boolean;
          expectedAt?: Date | null;
          dateIssue?: Date | null;
          dateExpiration?: Date | null;
          createdAt: Date;
        };
        warehouse?: {
          id: string;
          name: string;
          department: string;
          province: string;
          district: string;
          address?: string | null;
          isActive: boolean;
          createdAt: Date;
        };
        supplier?: {
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
      }
    | {
        type: ReferenceType.PRODUCTION;
        production: {
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
        fromWarehouse?: {
          id: string;
          name: string;
          department: string;
          province: string;
          district: string;
          address?: string | null;
          isActive: boolean;
          createdAt: Date;
        };
        toWarehouse?: {
          id: string;
          name: string;
          department: string;
          province: string;
          district: string;
          address?: string | null;
          isActive: boolean;
          createdAt: Date;
        };
        createdBy?: {
          id: string;
          name: string;
          email: string;
          avatarUrl?: string;
          telefono?: string;
          deleted: boolean;
          createdAt: Date;
          updatedAt: Date;
          failedLoginAttempts: number;
          lockoutLevel: number;
          lockedUntil: Date | null;
          securityDisabledAt: Date | null;
        };
      };
  warehouse?: {
    id: string;
    name: string;
    department: string;
    province: string;
    district: string;
    address?: string | null;
    isActive: boolean;
    createdAt: Date;
  };
  stockItem?: {
    id: string;
    type: string;
    productId?: string | null;
    variantId?: string | null;
    isActive: boolean;
    createdAt: Date;
    product?: {
      id: string;
      name: string;
      sku: string;
      barcode: string | null;
      isActive: boolean;
      createdAt: Date;
    } | null;
    variant?: {
      id: string;
      productId: string;
      sku: string;
      barcode: string | null;
      isActive: boolean;
      createdAt: Date;
    } | null;
  };
  locationId?: string;
  stockItemId: string;
  direction: Direction;
  quantity: number;
  unitCost?: number | null;
  createdAt?: Date;
  balance?: number;
}
