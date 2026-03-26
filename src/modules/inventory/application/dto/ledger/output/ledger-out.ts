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
      id: string;
      name: string;
      email: string;
    } | null;
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
          expectedAt?: Date | null;
          dateIssue?: Date | null;
          dateExpiration?: Date | null;
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
        createdBy?: {
          id: string;
          name: string;
          email: string;
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
        createdBy?: {
          id: string;
          name: string;
          email: string;
        };
      };
  stockItem?: {
    id: string;
    type: string;
    productId?: string | null;
    variantId?: string | null;
    product?: {
      id: string;
      name: string;
      sku: string;
      unidad?: string;
    } | null;
    variant?: {
      id: string;
      productId: string;
      name?: string;
      sku: string;
      unidad?: string;
    } | null;
  };
  locationId?: string;
  stockItemId: string;
  direction: Direction;
  quantity: number;
  wasteQty?: number | null;
  unitCost?: number | null;
  createdAt?: Date;
  balance?: number;
}
