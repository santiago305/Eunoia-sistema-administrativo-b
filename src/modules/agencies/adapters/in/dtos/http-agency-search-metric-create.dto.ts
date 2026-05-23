import { Type } from "class-transformer";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
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

class HttpAgencySearchRuleDto {
  @IsEnum(AgencySearchFields)
  field: AgencySearchField;

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

class HttpAgencySearchSnapshotDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpAgencySearchRuleDto)
  filters: HttpAgencySearchRuleDto[];
}

export class HttpCreateAgencySearchMetricDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpAgencySearchSnapshotDto)
  snapshot: HttpAgencySearchSnapshotDto;
}
