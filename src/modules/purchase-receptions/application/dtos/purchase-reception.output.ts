import { PurchaseItemType } from "src/modules/purchases/domain/value-objects/purchase-item-type";
import { PurchaseReceptionStatus } from "../../domain/entity/purchase-reception";

export type PurchaseReceptionItemOutput = {
  receptionItemId?: string;
  purchaseItemId: string;
  stockItemId?: string;
  itemType: PurchaseItemType;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  affectsStock: boolean;
  stockPosted: boolean;
  serviceConfirmed: boolean;
  note?: string;
};

export type PurchaseReceptionOutput = {
  receptionId?: string;
  purchaseId: string;
  warehouseId?: string;
  status: PurchaseReceptionStatus;
  receivedByUserId?: string;
  receivedAt?: Date;
  note?: string;
  evidenceUrls: string[];
  inventoryDocumentId?: string;
  createdAt?: Date;
  items: PurchaseReceptionItemOutput[];
};
