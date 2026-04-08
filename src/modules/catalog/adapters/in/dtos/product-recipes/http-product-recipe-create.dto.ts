import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';

export class HttpCreateProductRecipeDto {
  @IsEnum(StockItemType)
  finishedType: StockItemType;

  @IsUUID()
  finishedItemId: string;

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
