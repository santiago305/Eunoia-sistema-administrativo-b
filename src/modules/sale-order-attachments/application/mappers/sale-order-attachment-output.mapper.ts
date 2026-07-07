import { SaleOrderAttachment } from '../../domain/entities/sale-order-attachment';
import { SaleOrderAttachmentOutput } from '../dtos/sale-order-attachment.output';

export class SaleOrderAttachmentOutputMapper {
  static toOutput(
    attachment: SaleOrderAttachment,
  ): SaleOrderAttachmentOutput {
    return {
      id: attachment.id!,
      saleOrderId: attachment.saleOrderId,
      saleOrderPaymentId: attachment.saleOrderPaymentId,
      type: attachment.type,
      filename: attachment.filename,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      url: attachment.url,
      note: attachment.note,
      createdAt: attachment.createdAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
