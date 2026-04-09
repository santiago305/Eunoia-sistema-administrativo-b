import { Product } from "src/modules/catalog/domain/entity/product";
import { ProductVariantWithProductInfo } from "src/modules/catalog/domain/read-models/product-variant-with-product-info.rm";
import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";
import { Warehouse } from "src/modules/warehouses/domain/entities/warehouse";

export interface InventorySnapshotOutput {
  warehouseId: string;
  warehouse?: Warehouse | null;
  stockItemId: string;
  stockItem?: {
    id: string;
    type: StockItemType;
    productId?: string | null;
    variantId?: string | null;
    product?: Product | null;
    variant?: ProductVariantWithProductInfo | null;
  } | null;
  locationId?: string;
  onHand: number;
  reserved: number;
  available: number | null;
}
