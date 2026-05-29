import { Type } from "class-transformer";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
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

class HttpSaleOrderSearchRangeDto {
  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;
}

class HttpSaleOrderSearchRuleDto {
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

class HttpSaleOrderSearchSnapshotDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpSaleOrderSearchRuleDto)
  filters: HttpSaleOrderSearchRuleDto[];
}

export class HttpCreateSaleOrderSearchMetricDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpSaleOrderSearchSnapshotDto)
  snapshot: HttpSaleOrderSearchSnapshotDto;
}

