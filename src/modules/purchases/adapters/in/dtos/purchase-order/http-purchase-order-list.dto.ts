import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";

export class HttpListPurchaseOrdersQueryDto {
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(VoucherDocType)
  documentType?: VoucherDocType;

  @IsOptional()
  @IsString()
  serie?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  correlative?: number;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
