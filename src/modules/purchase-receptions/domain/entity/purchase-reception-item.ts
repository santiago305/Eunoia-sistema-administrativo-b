import { PurchaseItemType } from "src/modules/purchases/domain/value-objects/purchase-item-type";

export class PurchaseReceptionItem {
  constructor(
    public readonly receptionItemId: string | undefined,
    public readonly receptionId: string,
    public readonly purchaseItemId: string,
    public readonly stockItemId: string | undefined,
    public readonly itemType: PurchaseItemType,
    public readonly orderedQuantity: number,
    public readonly receivedQuantity: number,
    public readonly acceptedQuantity: number,
    public readonly rejectedQuantity: number,
    public readonly affectsStock: boolean,
    public readonly stockPosted: boolean = false,
    public readonly serviceConfirmed: boolean = false,
    public readonly note?: string,
  ) {}
}
