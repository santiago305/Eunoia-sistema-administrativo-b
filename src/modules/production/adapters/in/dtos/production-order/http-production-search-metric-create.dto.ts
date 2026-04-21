import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import {
  ProductionSearchField,
  ProductionSearchFields,
  ProductionSearchOperator,
  ProductionSearchOperators,
  ProductionSearchRuleMode,
} from "src/modules/production/application/dto/production-search/production-search-snapshot";

const ProductionSearchRuleModes = {
  INCLUDE: "include",
  EXCLUDE: "exclude",
} as const;

class HttpProductionSearchRangeDto {
  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;
}

class HttpProductionSearchRuleDto {
  @IsEnum(ProductionSearchFields)
  field: ProductionSearchField;

  @IsEnum(ProductionSearchOperators)
  operator: ProductionSearchOperator;

  @IsOptional()
  @IsEnum(ProductionSearchRuleModes)
  mode?: ProductionSearchRuleMode;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => HttpProductionSearchRangeDto)
  range?: HttpProductionSearchRangeDto;
}

class HttpProductionSearchSnapshotDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpProductionSearchRuleDto)
  filters: HttpProductionSearchRuleDto[];
}

export class HttpCreateProductionSearchMetricDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpProductionSearchSnapshotDto)
  snapshot: HttpProductionSearchSnapshotDto;
}
