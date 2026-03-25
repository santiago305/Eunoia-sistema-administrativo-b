import type { ProductOutput } from "src/modules/catalog/application/dto/products/output/product-out";
import type { ProductVariantOutput } from "src/modules/catalog/application/dto/product-variants/output/product-variant-out";
import type { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import type { ProductionOrderListSerieOutput } from "./production-order-paginated";

export interface ProductionOrderFinishedItemOutput {
  type: StockItemType;
  product?: ProductOutput | null;
  variant?: ProductVariantOutput | null;
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
  createdAt: Date;
  items: ProductionOrderDetailItemOutput[];
}
