import type { StockItemType } from "src/shared/domain/value-objects/stock-item-type";
import type { SkuAttributeInput } from "src/modules/product-catalog/domain/ports/sku.repository";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import type { ProductionOrderListSerieOutput } from "./production-order-paginated";

export interface ProductionOrderLegacyProductOutput {
  id: string;
  name: string | null;
  sku: string | null;
}

export interface ProductionOrderSkuOutput {
  id: string;
  productId: string;
  productName: string;
  name: string;
  backendSku: string;
  customSku: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  isActive: boolean;
  attributes: SkuAttributeInput[];
}

export interface ProductionOrderFinishedItemOutput {
  type: StockItemType | "SKU";
  productId?: string | null;
  product?: ProductionOrderLegacyProductOutput | null;
  sku?: ProductionOrderSkuOutput | null;
}

export interface ProductionOrderDetailItemOutput {
  id: string;
  productionId: string;
  finishedItemId: string;
  finishedItem?: ProductionOrderFinishedItemOutput | null;
  fromLocationId: string | null;
  toLocationId: string | null;
  quantity: number;
  wasteQty?: number | null;
  unitCost: number;
}

export interface ProductionOrderDetailOutput {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  serieId: string;
  serie?: ProductionOrderListSerieOutput | null;
  correlative: number;
  status: ProductionStatus;
  reference: string;
  manufactureDate: Date;
  createdBy: string;
  createdByName?: string | null;
  createdAt: Date;
  imageProdution?: string[];
  items: ProductionOrderDetailItemOutput[];
}


