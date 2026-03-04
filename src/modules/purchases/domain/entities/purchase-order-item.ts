import { Money } from "src/modules/catalog/domain/value-object/money.vo";
import { AfectIgvType } from "../value-objects/afect-igv-type";

export class PurchaseOrderItem {
  constructor(
    public readonly poItemId: string,
    public readonly poId: string,
    public readonly stockItemId: string,
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
  ) {}
}
