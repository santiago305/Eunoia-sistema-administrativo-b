import { Type } from "class-transformer";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
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

class HttpWarehouseSearchRuleDto {
  @IsEnum(WarehouseSearchFields)
  field: WarehouseSearchField;

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

class HttpWarehouseSearchSnapshotDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpWarehouseSearchRuleDto)
  filters: HttpWarehouseSearchRuleDto[];
}

export class HttpCreateWarehouseSearchMetricDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpWarehouseSearchSnapshotDto)
  snapshot: HttpWarehouseSearchSnapshotDto;
}
