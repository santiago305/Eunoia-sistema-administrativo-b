import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";
import { AfectIgvType } from "src/modules/purchases/domain/value-objects/afect-igv-type";

export class HttpAddPurchaseOrderItemDto {
  @IsUUID()
  stockItemId: string;

  @IsOptional()
  @IsString()
  unitBase?: string;
  
  @IsOptional()
  @IsString()
  equivalence?: string;

  @IsOptional()
  @IsInt()
  factor?: number;

  @IsOptional()
  @IsEnum(AfectIgvType)
  afectType?: AfectIgvType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  porcentageIgv?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseWithoutIgv?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountIgv?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitValue?: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseValue?: number;
}
