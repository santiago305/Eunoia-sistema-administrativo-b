import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';

export class HttpCreateCatalogPublicationDto {
  @IsString()
  channelCode: string;

  @IsEnum(StockItemType)
  sourceType: StockItemType;

  @IsUUID()
  itemId: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceOverride?: number | null;

  @IsOptional()
  @IsString()
  displayNameOverride?: string | null;
}
