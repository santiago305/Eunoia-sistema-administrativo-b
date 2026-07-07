import { SaleOrderAttachmentType } from '../../domain/value-objects/sale-order-attachment-type';

export type SaleOrderAttachmentOutput = {
  id: string;
  saleOrderId: string;
  saleOrderPaymentId: string | null;
  type: SaleOrderAttachmentType;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  note: string | null;
  createdAt: string;
};
