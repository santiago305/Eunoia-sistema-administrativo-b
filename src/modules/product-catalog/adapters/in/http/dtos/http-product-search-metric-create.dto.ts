import { Type } from "class-transformer";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import {
  ProductCatalogProductSearchField,
  ProductCatalogProductSearchFields,
  ProductCatalogProductSearchOperator,
  ProductCatalogProductSearchOperators,
  type ProductCatalogProductSearchRuleMode,
} from "src/modules/product-catalog/application/dtos/product-search/product-search-snapshot";

const ProductSearchRuleModes = {
  INCLUDE: "include",
  EXCLUDE: "exclude",
} as const;

class HttpProductSearchRuleDto {
  @IsEnum(ProductCatalogProductSearchFields)
  field: ProductCatalogProductSearchField;

  @IsEnum(ProductCatalogProductSearchOperators)
  operator: ProductCatalogProductSearchOperator;

  @IsOptional()
  @IsEnum(ProductSearchRuleModes)
  mode?: ProductCatalogProductSearchRuleMode;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}

class HttpProductSearchSnapshotDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpProductSearchRuleDto)
  filters: HttpProductSearchRuleDto[];
}

export class HttpCreateProductSearchMetricDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpProductSearchSnapshotDto)
  snapshot: HttpProductSearchSnapshotDto;
}

