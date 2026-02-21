import { IsNumber, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class HttpCreateProductEquivalenceDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  fromUnitId: string;

  @IsUUID()
  toUnitId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  factor: number;
}
