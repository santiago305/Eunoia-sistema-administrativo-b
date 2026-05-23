import { plainToInstance, Transform, Type } from "class-transformer";
import { IsArray, IsBooleanString, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import {
  AgencySearchField,
  AgencySearchFields,
  AgencySearchOperator,
  AgencySearchOperators,
  AgencySearchRuleMode,
} from "src/modules/agencies/application/dtos/agency-search/agency-search-snapshot";

const AgencySearchRuleModes = {
  INCLUDE: "include",
  EXCLUDE: "exclude",
} as const;

const toFiltersArray = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => plainToInstance(HttpAgencySearchRuleDto, item));
  }
  if (typeof value !== "string") return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => plainToInstance(HttpAgencySearchRuleDto, item))
      : undefined;
  } catch {
    return undefined;
  }
};

class HttpAgencySearchRuleDto {
  @IsString()
  @IsOptional()
  @IsEnum(AgencySearchFields)
  field: AgencySearchField;

  @IsString()
  @IsOptional()
  @IsEnum(AgencySearchOperators)
  operator: AgencySearchOperator;

  @IsOptional()
  @IsEnum(AgencySearchRuleModes)
  mode?: AgencySearchRuleMode;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}

export class ListAgenciesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
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
  @Type(() => HttpAgencySearchRuleDto)
  filters?: HttpAgencySearchRuleDto[];
}

