import { PurchaseAttachment } from "../../domain/entity/purchase-attachment";
import { PurchaseAttachmentOutput } from "../dtos/purchase-attachment.output";

export class PurchaseAttachmentOutputMapper {
  static toOutput(row: PurchaseAttachment): PurchaseAttachmentOutput {
    return {
      attachmentId: row.attachmentId ?? "",
      purchaseId: row.purchaseId,
      paymentId: row.paymentId ?? null,
      receptionId: row.receptionId ?? null,
      fiscalDocumentType: row.fiscalDocumentType ?? null,
      type: row.type,
      filename: row.filename,
      originalName: row.originalName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      url: row.url,
      note: row.note ?? null,
      uploadedByUserId: row.uploadedByUserId ?? null,
      createdAt: row.createdAt ?? null,
    };
  }
}

