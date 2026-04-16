import { StockItemType } from "src/shared/domain/value-objects/stock-item-type";
import { ProductCatalogSkuWithAttributes, SkuAttributeInput } from "src/modules/product-catalog/domain/ports/sku.repository";
import { AfectIgvType } from "src/modules/purchases/domain/value-objects/afect-igv-type";

export interface PurchaseOrderLegacyProductOutput {
  id: string;
  name: string | null;
  sku: string | null;
}

export interface PurchaseOrderSkuOutput {
  id: string;
  productId: string;
  productName: string;
  name: string;
  backendSku: string;
  customSku: string | null;
  barcode: string | null;
  attributes: SkuAttributeInput[];
  isActive: boolean;
}

export interface PurchaseOrderStockItemOutput {
  type: StockItemType | "SKU";
  stockItemId: string;
  product?: PurchaseOrderLegacyProductOutput | null;
  sku?: PurchaseOrderSkuOutput | null;
}

export interface PurchaseOrderItemOutput {
  poItemId: string;
  poId: string;
  stockItemId?: string;
  stockItem?: PurchaseOrderStockItemOutput | null;
  sku?:ProductCatalogSkuWithAttributes;
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

