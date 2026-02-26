import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsUUID, Min } from 'class-validator';

export class HttpAddItemTransferDto {
  @IsUUID()
  stockItemId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @IsUUID()
  fromLocationId: string;

  @IsUUID()
  toLocationId: string;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  unitCost?: number;
}

