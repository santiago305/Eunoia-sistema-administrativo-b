import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class HttpCreateProductRecipeDto {
  @IsUUID()
  finishedVariantId: string;

  @IsUUID()
  primaVariantId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  waste?: number;
}
