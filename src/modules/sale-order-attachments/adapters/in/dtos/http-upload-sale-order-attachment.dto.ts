import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SaleOrderAttachmentType } from '../../../domain/value-objects/sale-order-attachment-type';

export class HttpUploadSaleOrderAttachmentDto {
  @IsUUID()
  saleOrderId: string;

  @IsOptional()
  @IsUUID()
  saleOrderPaymentId?: string;

  @IsEnum(SaleOrderAttachmentType)
  type: SaleOrderAttachmentType;

  @IsOptional()
  @IsString()
  note?: string;
}
