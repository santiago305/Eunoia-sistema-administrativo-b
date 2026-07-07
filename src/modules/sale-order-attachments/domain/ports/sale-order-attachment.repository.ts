import { TransactionContext } from 'src/shared/domain/ports/transaction-context.port';
import { SaleOrderAttachment } from '../entities/sale-order-attachment';
import { SaleOrderAttachmentType } from '../value-objects/sale-order-attachment-type';

export const SALE_ORDER_ATTACHMENT_REPOSITORY = Symbol(
  'SALE_ORDER_ATTACHMENT_REPOSITORY',
);

export interface SaleOrderAttachmentRepository {
  create(
    attachment: SaleOrderAttachment,
    tx?: TransactionContext,
  ): Promise<SaleOrderAttachment>;
  findActiveById(
    attachmentId: string,
    tx?: TransactionContext,
  ): Promise<SaleOrderAttachment | null>;
  list(
    params: {
      saleOrderId?: string;
      saleOrderPaymentId?: string;
      type?: SaleOrderAttachmentType;
    },
    tx?: TransactionContext,
  ): Promise<SaleOrderAttachment[]>;
  markDeleted(
    attachmentId: string,
    deletedAt: Date,
    tx?: TransactionContext,
  ): Promise<void>;
}
