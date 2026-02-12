import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsUUID, Min } from 'class-validator';

export class HttpAddItemAdjustmentDto {
  @IsUUID()
  variantId: string;

  @Type(() => Number)
  @IsInt()
  quantity: number;

  @IsUUID()
  fromLocationId: string;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  unitCost?: number;
}
