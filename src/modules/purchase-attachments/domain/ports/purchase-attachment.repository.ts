import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { PurchaseAttachment } from "../entity/purchase-attachment";
import { PurchaseAttachmentType } from "../value-objects/purchase-attachment-type";

export const PURCHASE_ATTACHMENT_REPOSITORY = Symbol("PURCHASE_ATTACHMENT_REPOSITORY");

export type ListPurchaseAttachmentsParams = {
  purchaseId?: string;
  paymentId?: string;
  receptionId?: string;
  type?: PurchaseAttachmentType;
};

export interface PurchaseAttachmentRepository {
  create(attachment: PurchaseAttachment, tx?: TransactionContext): Promise<PurchaseAttachment>;
  findActiveById(attachmentId: string, tx?: TransactionContext): Promise<PurchaseAttachment | null>;
  list(params: ListPurchaseAttachmentsParams, tx?: TransactionContext): Promise<PurchaseAttachment[]>;
  markDeleted(attachmentId: string, deletedAt: Date, tx?: TransactionContext): Promise<void>;
}

