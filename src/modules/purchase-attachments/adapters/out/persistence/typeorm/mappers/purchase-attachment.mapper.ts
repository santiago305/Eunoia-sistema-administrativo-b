import { PurchaseAttachment } from "src/modules/purchase-attachments/domain/entity/purchase-attachment";
import { PurchaseAttachmentEntity } from "../entities/purchase-attachment.entity";

export class PurchaseAttachmentMapper {
  static toDomain(row: PurchaseAttachmentEntity): PurchaseAttachment {
    return PurchaseAttachment.create({
      attachmentId: row.id,
      purchaseId: row.purchaseId,
      type: row.type,
      filename: row.filename,
      originalName: row.originalName,
      mimeType: row.mimeType,
      sizeBytes: Number(row.sizeBytes),
      url: row.url,
      storagePath: row.storagePath,
      uploadedByUserId: row.uploadedByUserId ?? null,
      paymentId: row.paymentId ?? null,
      receptionId: row.receptionId ?? null,
      note: row.note ?? null,
      deletedAt: row.deletedAt ?? null,
      createdAt: row.createdAt,
    });
  }

  static toPersistence(attachment: PurchaseAttachment): Partial<PurchaseAttachmentEntity> {
    return {
      id: attachment.attachmentId,
      purchaseId: attachment.purchaseId,
      type: attachment.type,
      filename: attachment.filename,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      url: attachment.url,
      storagePath: attachment.storagePath,
      uploadedByUserId: attachment.uploadedByUserId ?? null,
      paymentId: attachment.paymentId ?? null,
      receptionId: attachment.receptionId ?? null,
      note: attachment.note ?? null,
      deletedAt: attachment.deletedAt ?? null,
    };
  }
}

