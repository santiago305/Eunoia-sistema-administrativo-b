import { plainToInstance, Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import {
  ClientSearchField,
  ClientSearchFields,
  ClientSearchOperator,
  ClientSearchOperators,
  ClientSearchRuleMode,
} from "src/modules/clients/application/dtos/client-search/client-search-snapshot";

const ClientSearchRuleModes = {
  INCLUDE: "include",
  EXCLUDE: "exclude",
} as const;

const toFiltersArray = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => plainToInstance(HttpClientSearchRuleDto, item));
  }
  if (typeof value !== "string") return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => plainToInstance(HttpClientSearchRuleDto, item))
      : undefined;
  } catch {
    return undefined;
  }
};

class HttpClientSearchRuleDto {
  @IsString()
  @IsOptional()
  @IsEnum(ClientSearchFields)
  field: ClientSearchField;

  @IsString()
  @IsOptional()
  @IsEnum(ClientSearchOperators)
  operator: ClientSearchOperator;

  @IsOptional()
  @IsEnum(ClientSearchRuleModes)
  mode?: ClientSearchRuleMode;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}

export class ListClientsQueryDto {
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
  @Type(() => HttpClientSearchRuleDto)
  filters?: HttpClientSearchRuleDto[];
}
