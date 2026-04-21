import { Type } from "class-transformer";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import {
  SupplierSearchField,
  SupplierSearchFields,
  SupplierSearchOperator,
  SupplierSearchOperators,
  SupplierSearchRuleMode,
} from "src/modules/suppliers/application/dtos/supplier-search/supplier-search-snapshot";

const SupplierSearchRuleModes = {
  INCLUDE: "include",
  EXCLUDE: "exclude",
} as const;

class HttpSupplierSearchRuleDto {
  @IsEnum(SupplierSearchFields)
  field: SupplierSearchField;

  @IsEnum(SupplierSearchOperators)
  operator: SupplierSearchOperator;

  @IsOptional()
  @IsEnum(SupplierSearchRuleModes)
  mode?: SupplierSearchRuleMode;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}

class HttpSupplierSearchSnapshotDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpSupplierSearchRuleDto)
  filters: HttpSupplierSearchRuleDto[];
}

export class HttpCreateSupplierSearchMetricDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpSupplierSearchSnapshotDto)
  snapshot: HttpSupplierSearchSnapshotDto;
}
