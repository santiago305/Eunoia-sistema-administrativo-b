import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from "class-validator";

export class HttpCreatePurchaseReceptionItemDto {
  @IsUUID()
  purchaseItemId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  receivedQuantity: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  acceptedQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rejectedQuantity?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class HttpCreatePurchaseReceptionDto {
  @IsUUID()
  purchaseId: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HttpCreatePurchaseReceptionItemDto)
  items: HttpCreatePurchaseReceptionItemDto[];

  @IsOptional()
  @IsBoolean()
  confirmNow?: boolean;
}
