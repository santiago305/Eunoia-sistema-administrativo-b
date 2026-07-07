import { Inject, Injectable } from '@nestjs/common';
import {
  SALE_ORDER_ATTACHMENT_REPOSITORY,
  SaleOrderAttachmentRepository,
} from '../../domain/ports/sale-order-attachment.repository';
import { SaleOrderAttachmentType } from '../../domain/value-objects/sale-order-attachment-type';
import { SaleOrderAttachmentOutputMapper } from '../mappers/sale-order-attachment-output.mapper';

@Injectable()
export class ListSaleOrderAttachmentsUsecase {
  constructor(
    @Inject(SALE_ORDER_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepo: SaleOrderAttachmentRepository,
  ) {}

  async execute(input: {
    saleOrderId?: string;
    saleOrderPaymentId?: string;
    type?: SaleOrderAttachmentType;
  }) {
    const rows = await this.attachmentRepo.list(input);
    return rows.map((row) => SaleOrderAttachmentOutputMapper.toOutput(row));
  }
}
