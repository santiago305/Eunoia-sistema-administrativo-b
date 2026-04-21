import { plainToInstance, Transform, Type } from "class-transformer";
import { IsArray, IsBooleanString, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import { SupplierDocType } from "src/modules/suppliers/domain/object-values/supplier-doc-type";
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

const toFiltersArray = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => plainToInstance(HttpSupplierSearchRuleDto, item));
  }
  if (typeof value !== "string") return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => plainToInstance(HttpSupplierSearchRuleDto, item))
      : undefined;
  } catch {
    return undefined;
  }
};

class HttpSupplierSearchRuleDto {
  @IsString()
  @IsEnum(SupplierSearchFields)
  field: SupplierSearchField;

  @IsString()
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

export class ListSupplierQueryDto {
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
  @IsEnum(SupplierDocType)
  documentType?: SupplierDocType;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => toFiltersArray(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpSupplierSearchRuleDto)
  filters?: HttpSupplierSearchRuleDto[];
}
