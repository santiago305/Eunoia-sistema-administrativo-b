import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class HttpAddItemAdjustmentDto {
  @IsUUID()
  stockItemId: string;

  @Type(() => Number)
  @IsInt()
  quantity: number;
  
  @IsUUID()
  @IsOptional()
  fromLocationId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitCost?: number;

  @IsString()
  @MaxLength(60)
  @IsNotEmpty()
  adjustmentType?: string;
}

