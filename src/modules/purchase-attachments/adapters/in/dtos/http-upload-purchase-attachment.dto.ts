import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { PurchaseAttachmentType } from "src/modules/purchase-attachments/domain/value-objects/purchase-attachment-type";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";

export class HttpUploadPurchaseAttachmentDto {
  @IsUUID()
  purchaseId: string;

  @IsEnum(PurchaseAttachmentType)
  type: PurchaseAttachmentType;

  @IsOptional()
  @IsEnum(VoucherDocType)
  fiscalDocumentType?: VoucherDocType;

  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @IsOptional()
  @IsUUID()
  receptionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

