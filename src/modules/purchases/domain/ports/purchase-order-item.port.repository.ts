import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { PurchaseOrderItem } from "../entities/purchase-order-item";

export const PURCHASE_ORDER_ITEM = Symbol("PURCHASE_ORDER_ITEM");

export interface PurchaseOrderItemRepository {
  add(item: PurchaseOrderItem, tx?: TransactionContext): Promise<PurchaseOrderItem>;
  remove(poItemId: string, tx?: TransactionContext): Promise<boolean>;
  removeByPurchaseId(poId: string, tx?: TransactionContext): Promise<number>;
  getByPurchaseId(poId: string, tx?: TransactionContext): Promise<PurchaseOrderItem[]>;
}
