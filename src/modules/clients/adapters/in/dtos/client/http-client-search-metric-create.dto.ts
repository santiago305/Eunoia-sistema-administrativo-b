import { Type } from "class-transformer";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
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

class HttpClientSearchRuleDto {
  @IsEnum(ClientSearchFields)
  field: ClientSearchField;

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

class HttpClientSearchSnapshotDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpClientSearchRuleDto)
  filters: HttpClientSearchRuleDto[];
}

export class HttpCreateClientSearchMetricDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpClientSearchSnapshotDto)
  snapshot: HttpClientSearchSnapshotDto;
}

