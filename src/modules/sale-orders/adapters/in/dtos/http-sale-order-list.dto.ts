import { plainToInstance, Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import {
  SaleOrderSearchField,
  SaleOrderSearchFields,
  SaleOrderSearchOperator,
  SaleOrderSearchOperators,
  SaleOrderSearchRuleMode,
} from "src/modules/sale-orders/application/dtos/sale-order-search/sale-order-search-snapshot";

const SaleOrderSearchRuleModes = {
  INCLUDE: "include",
  EXCLUDE: "exclude",
} as const;

export const toSaleOrderFiltersArray = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => plainToInstance(HttpSaleOrderSearchRuleDto, item));
  }
  if (typeof value !== "string") return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => plainToInstance(HttpSaleOrderSearchRuleDto, item)) : undefined;
  } catch {
    return undefined;
  }
};

class HttpSaleOrderSearchRangeDto {
  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;
}

export class HttpSaleOrderSearchRuleDto {
  @IsEnum(SaleOrderSearchFields)
  field: SaleOrderSearchField;

  @IsEnum(SaleOrderSearchOperators)
  operator: SaleOrderSearchOperator;

  @IsOptional()
  @IsEnum(SaleOrderSearchRuleModes)
  mode?: SaleOrderSearchRuleMode;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => HttpSaleOrderSearchRangeDto)
  range?: HttpSaleOrderSearchRangeDto;
}

export class HttpListSaleOrdersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => toSaleOrderFiltersArray(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpSaleOrderSearchRuleDto)
  filters?: HttpSaleOrderSearchRuleDto[];

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

