import { ProductCatalogProductType } from '../../domain/value-objects/product-type';

export const INVENTORY_RESERVATION_DETAILS_QUERY = Symbol(
  'INVENTORY_RESERVATION_DETAILS_QUERY',
);

export type InventoryReservationSourceType = 'SALE_ORDER' | 'PRODUCTION_ORDER';

export type InventoryReservationDetail = {
  sourceType: InventoryReservationSourceType;
  sourceId: string;
  documentNumber: string;
  subjectName: string | null;
  statusCode: string;
  statusName: string;
  plannedDate: string | null;
  createdAt: string;
  quantity: number;
};

export type InventoryReservationDetailsResult = {
  stockItemId: string;
  warehouseId: string;
  productType: ProductCatalogProductType;
  inventoryReserved: number;
  attributedReserved: number;
  difference: number;
  items: InventoryReservationDetail[];
};

export interface InventoryReservationDetailsQuery {
  list(params: {
    stockItemId: string;
    warehouseId: string;
    productType: ProductCatalogProductType;
  }): Promise<InventoryReservationDetailsResult>;
}
