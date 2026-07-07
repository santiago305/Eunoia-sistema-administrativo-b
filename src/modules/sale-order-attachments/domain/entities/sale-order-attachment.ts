import { SaleOrderAttachmentType } from '../value-objects/sale-order-attachment-type';

export class SaleOrderAttachment {
  constructor(
    public readonly id: string | undefined,
    public readonly saleOrderId: string,
    public readonly saleOrderPaymentId: string | null,
    public readonly type: SaleOrderAttachmentType,
    public readonly filename: string,
    public readonly originalName: string,
    public readonly mimeType: string,
    public readonly sizeBytes: number,
    public readonly url: string,
    public readonly storagePath: string,
    public readonly uploadedByUserId: string | null,
    public readonly note: string | null,
    public readonly deletedAt: Date | null,
    public readonly createdAt?: Date,
  ) {}

  static create(params: {
    id?: string;
    saleOrderId: string;
    saleOrderPaymentId?: string | null;
    type: SaleOrderAttachmentType;
    filename: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
    storagePath: string;
    uploadedByUserId?: string | null;
    note?: string | null;
    deletedAt?: Date | null;
    createdAt?: Date;
  }) {
    return new SaleOrderAttachment(
      params.id,
      params.saleOrderId,
      params.saleOrderPaymentId ?? null,
      params.type,
      params.filename.trim(),
      params.originalName.trim(),
      params.mimeType.trim(),
      params.sizeBytes,
      params.url.trim(),
      params.storagePath.trim(),
      params.uploadedByUserId ?? null,
      params.note?.trim() || null,
      params.deletedAt ?? null,
      params.createdAt,
    );
  }
}
