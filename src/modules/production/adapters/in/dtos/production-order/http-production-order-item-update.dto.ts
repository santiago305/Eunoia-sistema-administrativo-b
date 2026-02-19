import { IsInt, IsOptional, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";

export class HttpUpdateProductionOrderItemDto {
  @IsOptional()
  @IsUUID()
  finishedVariantId?: string;

  @IsOptional()
  @IsUUID()
  fromLocationId?: string;

  @IsOptional()
  @IsUUID()
  toLocationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitCost?: number;
}
