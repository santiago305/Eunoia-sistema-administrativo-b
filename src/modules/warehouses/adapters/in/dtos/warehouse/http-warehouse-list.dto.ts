import { plainToInstance, Transform, Type } from "class-transformer";
import { IsArray, IsBooleanString, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import {
  WarehouseSearchField,
  WarehouseSearchFields,
  WarehouseSearchOperator,
  WarehouseSearchOperators,
  WarehouseSearchRuleMode,
} from "src/modules/warehouses/application/dtos/warehouse-search/warehouse-search-snapshot";

const WarehouseSearchRuleModes = {
  INCLUDE: "include",
  EXCLUDE: "exclude",
} as const;

const toFiltersArray = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => plainToInstance(HttpWarehouseSearchRuleDto, item));
  }
  if (typeof value !== "string") return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => plainToInstance(HttpWarehouseSearchRuleDto, item))
      : undefined;
  } catch {
    return undefined;
  }
};

class HttpWarehouseSearchRuleDto {
  @IsString()
  @IsOptional()
  @IsEnum(WarehouseSearchFields)
  field: WarehouseSearchField;

  @IsString()
  @IsOptional()
  @IsEnum(WarehouseSearchOperators)
  operator: WarehouseSearchOperator;

  @IsOptional()
  @IsEnum(WarehouseSearchRuleModes)
  mode?: WarehouseSearchRuleMode;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}

export class ListWarehouseQueryDto {
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
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Transform(({ value }) => toFiltersArray(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpWarehouseSearchRuleDto)
  filters?: HttpWarehouseSearchRuleDto[];
}
