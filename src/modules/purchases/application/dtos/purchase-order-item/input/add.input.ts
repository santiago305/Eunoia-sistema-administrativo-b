import { AfectIgvType } from "src/modules/purchases/domain/value-objects/afect-igv-type";
import { PurchaseItemType } from "src/modules/purchases/domain/value-objects/purchase-item-type";

export interface AddPurchaseOrderItemInput {
  poId?: string;
  skuId?: string;
  stockItemId?: string;
  unitBase?: string,
  equivalence?: string,
  factor?: number,
  afectType?: AfectIgvType;
  quantity?: number;
  porcentageIgv?: number;
  baseWithoutIgv?: number;
  amountIgv?: number;
  unitValue?: number;
  unitPrice?: number;
  purchaseValue?: number;
  itemType?: PurchaseItemType;
  internalMaterialId?: string;
  assetCategoryId?: string;
  serviceName?: string;
  description?: string;
  warehouseId?: string;
  affectsStock?: boolean;
  generatesAsset?: boolean;
  isService?: boolean;
  isSubscription?: boolean;
}
