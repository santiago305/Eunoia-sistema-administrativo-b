import { PurchaseAttachmentType } from "../value-objects/purchase-attachment-type";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";

export class PurchaseAttachment {
  constructor(
    public readonly attachmentId: string | undefined,
    public readonly purchaseId: string,
    public readonly type: PurchaseAttachmentType,
    public readonly filename: string,
    public readonly originalName: string,
    public readonly mimeType: string,
    public readonly sizeBytes: number,
    public readonly url: string,
    public readonly storagePath: string,
    public readonly uploadedByUserId?: string | null,
    public readonly paymentId?: string | null,
    public readonly receptionId?: string | null,
    public readonly fiscalDocumentType?: VoucherDocType | null,
    public readonly note?: string | null,
    public readonly deletedAt?: Date | null,
    public readonly createdAt?: Date,
  ) {}

  static create(params: {
    attachmentId?: string;
    purchaseId: string;
    type: PurchaseAttachmentType;
    filename: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
    storagePath: string;
    uploadedByUserId?: string | null;
    paymentId?: string | null;
    receptionId?: string | null;
    fiscalDocumentType?: VoucherDocType | null;
    note?: string | null;
    deletedAt?: Date | null;
    createdAt?: Date;
  }) {
    return new PurchaseAttachment(
      params.attachmentId,
      params.purchaseId,
      params.type,
      params.filename.trim(),
      params.originalName.trim(),
      params.mimeType.trim(),
      params.sizeBytes,
      params.url.trim(),
      params.storagePath.trim(),
      params.uploadedByUserId ?? null,
      params.paymentId ?? null,
      params.receptionId ?? null,
      params.fiscalDocumentType ?? null,
      params.note?.trim() || null,
      params.deletedAt ?? null,
      params.createdAt,
    );
  }
}

