import { IsEnum, IsUUID } from 'class-validator';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';

export class ListProductRecipesQueryDto {
  @IsEnum(StockItemType)
  finishedType: StockItemType;

  @IsUUID()
  finishedItemId: string;
}
