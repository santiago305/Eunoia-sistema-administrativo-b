import { Money } from "src/shared/value-objets/money.vo";
import { AfectIgvType } from "../value-objects/afect-igv-type";
import { PurchaseItemType } from "../value-objects/purchase-item-type";

export class PurchaseOrderItem {
  constructor(
    public readonly poItemId: string,
    public readonly poId: string,
    public readonly stockItemId: string | undefined,
    public readonly unitBase: string,
    public readonly equivalence: string,
    public readonly factor: number,
    public readonly afectType: AfectIgvType,
    public readonly quantity: number,
    public readonly porcentageIgv: Money,
    public readonly baseWithoutIgv: Money,
    public readonly amountIgv: Money,
    public readonly unitValue: Money,
    public readonly unitPrice: Money,
    public readonly purchaseValue: Money,
    public readonly itemType: PurchaseItemType = PurchaseItemType.PRODUCT,
    public readonly internalMaterialId?: string,
    public readonly assetCategoryId?: string,
    public readonly serviceName?: string,
    public readonly description?: string,
    public readonly warehouseId?: string,
    public readonly affectsStock: boolean = true,
    public readonly generatesAsset: boolean = false,
    public readonly isService: boolean = false,
    public readonly isSubscription: boolean = false,
  ) {}
}
