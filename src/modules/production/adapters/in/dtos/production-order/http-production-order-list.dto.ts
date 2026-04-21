import { IsOptional, IsEnum, IsUUID, IsDateString, IsInt, Min, Max, IsString, IsArray, ValidateNested } from "class-validator";
import { plainToInstance, Transform, Type } from "class-transformer";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
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

const toFiltersArray = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => plainToInstance(HttpProductionSearchRuleDto, item));
  }
  if (typeof value !== "string") return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => plainToInstance(HttpProductionSearchRuleDto, item))
      : undefined;
  } catch {
    return undefined;
  }
};

class HttpProductionSearchRangeDto {
  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;
}

class HttpProductionSearchRuleDto {
  @IsString()
  @IsEnum(ProductionSearchFields)
  field: ProductionSearchField;

  @IsString()
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

export class HttpListProductionOrdersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(ProductionStatus)
  status?: ProductionStatus;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  skuId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Transform(({ value }) => toFiltersArray(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpProductionSearchRuleDto)
  filters?: HttpProductionSearchRuleDto[];

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
}
