import { plainToInstance, Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import {
  SourceSearchField,
  SourceSearchFields,
  SourceSearchOperator,
  SourceSearchOperators,
  SourceSearchRuleMode,
} from "src/modules/sources/application/dtos/source-search/source-search-snapshot";

const SourceSearchRuleModes = {
  INCLUDE: "include",
  EXCLUDE: "exclude",
} as const;

const toFiltersArray = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => plainToInstance(HttpSourceSearchRuleDto, item));
  }
  if (typeof value !== "string") return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => plainToInstance(HttpSourceSearchRuleDto, item))
      : undefined;
  } catch {
    return undefined;
  }
};

class HttpSourceSearchRuleDto {
  @IsString()
  @IsOptional()
  @IsEnum(SourceSearchFields)
  field: SourceSearchField;

  @IsString()
  @IsOptional()
  @IsEnum(SourceSearchOperators)
  operator: SourceSearchOperator;

  @IsOptional()
  @IsEnum(SourceSearchRuleModes)
  mode?: SourceSearchRuleMode;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}

export class ListSourcesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
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
  @Type(() => HttpSourceSearchRuleDto)
  filters?: HttpSourceSearchRuleDto[];
}

