import { PurchaseAttachmentType } from "../../domain/value-objects/purchase-attachment-type";

export type PurchaseAttachmentOutput = {
  attachmentId: string;
  purchaseId: string;
  paymentId: string | null;
  receptionId: string | null;
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

