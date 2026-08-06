import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { PurchaseOrderItem } from "../entities/purchase-order-item";
import { CurrencyType } from "../value-objects/currency-type";

export const PURCHASE_ORDER_ITEM = Symbol("PURCHASE_ORDER_ITEM");

export interface PurchaseOrderItemSummaryEntry {
  skuId?: string;
  name: string;
  backendSku?: string;
  customSku?: string;
  attributeName?: string;
  attributeValue?: string;
}

export interface PurchaseOrderItemSummary {
  total: number;
  items: PurchaseOrderItemSummaryEntry[];
}

export interface PurchaseOrderItemRepository {
  add(item: PurchaseOrderItem, tx?: TransactionContext): Promise<PurchaseOrderItem>;
  remove(poItemId: string, tx?: TransactionContext): Promise<boolean>;
  removeByPurchaseId(poId: string, tx?: TransactionContext): Promise<number>;
  getByPurchaseId(poId: string, currency: CurrencyType, tx?: TransactionContext): Promise<PurchaseOrderItem[]>;
  getSummariesByPurchaseIds(
    poIds: string[],
    maxItems?: number,
    tx?: TransactionContext,
  ): Promise<Map<string, PurchaseOrderItemSummary>>;
}
