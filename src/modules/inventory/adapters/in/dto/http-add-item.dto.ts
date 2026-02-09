import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, isString, IsUUID, Min } from 'class-validator';

export class HttpAddItemDto {
  // @IsUUID()
   @IsOptional()
  variantId: string;

  @Type(() => Number)
  @IsInt()
  quantity: number;

  @IsOptional()
  // @IsUUID()
  fromLocationId?: string;

  @IsOptional()
  // @IsUUID()
  toLocationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  unitCost?: number;
}
