import { Type } from 'class-transformer';
import { IsBooleanString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ProductType } from 'src/modules/catalog/domain/value-object/productType';

export class ListChannelCatalogItemsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;
}
