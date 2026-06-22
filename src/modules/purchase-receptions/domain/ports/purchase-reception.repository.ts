import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { PurchaseReception } from "../entity/purchase-reception";
import { PurchaseReceptionItem } from "../entity/purchase-reception-item";

export const PURCHASE_RECEPTION_REPOSITORY = Symbol("PURCHASE_RECEPTION_REPOSITORY");

export type PurchaseReceptionWithItems = {
  reception: PurchaseReception;
  items: PurchaseReceptionItem[];
};

export type PurchaseReceptionTotals = {
  purchaseItemId: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
};

export interface PurchaseReceptionRepository {
  create(
    reception: PurchaseReception,
    items: PurchaseReceptionItem[],
    tx?: TransactionContext,
  ): Promise<PurchaseReceptionWithItems>;
  findById(receptionId: string, tx?: TransactionContext): Promise<PurchaseReceptionWithItems | null>;
  listByPurchaseId(purchaseId: string, tx?: TransactionContext): Promise<PurchaseReceptionWithItems[]>;
  listConfirmedTotalsByPurchaseId(purchaseId: string, tx?: TransactionContext): Promise<PurchaseReceptionTotals[]>;
  confirm(
    receptionId: string,
    params: {
      receivedByUserId?: string;
      receivedAt: Date;
      inventoryDocumentId?: string;
      stockPostedItemIds?: string[];
      serviceConfirmedItemIds?: string[];
    },
    tx?: TransactionContext,
  ): Promise<void>;
}
