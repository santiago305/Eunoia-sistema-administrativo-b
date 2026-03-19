import { ProductOutput } from "src/modules/catalog/application/dto/products/output/product-out";
import { ProductVariantOutput } from "src/modules/catalog/application/dto/product-variants/output/product-variant-out";
import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";
import { AfectIgvType } from "src/modules/purchases/domain/value-objects/afect-igv-type";

export interface PurchaseOrderStockItemOutput {
  type: StockItemType;
  stockItemId: string;
  product?: ProductOutput | null;
  variant?: ProductVariantOutput | null;
}

export interface PurchaseOrderItemOutput {
  poItemId: string;
  poId: string;
  stockItemId: string;
  stockItem?: PurchaseOrderStockItemOutput | null;
  unitBase?: string | null;
  equivalence?: string | null;
  factor?: number | null;
  afectType?: AfectIgvType;
  quantity: number;
  porcentageIgv?: number;
  baseWithoutIgv?: number;
  amountIgv?: number;
  unitValue?: number;
  unitPrice: number;
  purchaseValue?: number;
}
