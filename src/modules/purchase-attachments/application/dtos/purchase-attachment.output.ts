import { PurchaseAttachmentType } from "../../domain/value-objects/purchase-attachment-type";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";

export type PurchaseAttachmentOutput = {
  attachmentId: string;
  purchaseId: string;
  paymentId: string | null;
  receptionId: string | null;
  fiscalDocumentType: VoucherDocType | null;
  type: PurchaseAttachmentType;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  note: string | null;
  uploadedByUserId: string | null;
  createdAt: Date | null;
};

