import { plainToInstance, Transform, Type } from "class-transformer";
import { IsArray, IsBooleanString, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import {
  PackSearchField,
  PackSearchFields,
  PackSearchOperator,
  PackSearchOperators,
  PackSearchRuleMode,
} from "src/modules/packs/application/dtos/pack-search/pack-search-snapshot";

const PackSearchRuleModes = {
  INCLUDE: "include",
  EXCLUDE: "exclude",
} as const;

const toFiltersArray = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => plainToInstance(HttpPackSearchRuleDto, item));
  }
  if (typeof value !== "string") return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => plainToInstance(HttpPackSearchRuleDto, item))
      : undefined;
  } catch {
    return undefined;
  }
};

class HttpPackSearchRuleDto {
  @IsString()
  @IsOptional()
  @IsEnum(PackSearchFields)
  field: PackSearchField;

  @IsString()
  @IsOptional()
  @IsEnum(PackSearchOperators)
  operator: PackSearchOperator;

  @IsOptional()
  @IsEnum(PackSearchRuleModes)
  mode?: PackSearchRuleMode;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}

export class ListPacksQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

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
  @Transform(({ value }) => toFiltersArray(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpPackSearchRuleDto)
  filters?: HttpPackSearchRuleDto[];
}
