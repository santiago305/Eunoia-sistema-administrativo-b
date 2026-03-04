import { AfectIgvType } from "src/modules/purchases/domain/value-objects/afect-igv-type";

export interface PurchaseOrderItemOutput {
  poItemId: string;
  poId: string;
  stockItemId: string;
  afectType?: AfectIgvType;
  quantity: number;
  porcentageIgv?: number;
  baseWithoutIgv?: number;
  amountIgv?: number;
  unitValue?: number;
  unitPrice: number;
  purchaseValue?: number;
}
