import { Type } from "class-transformer";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
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

class HttpSourceSearchRuleDto {
  @IsEnum(SourceSearchFields)
  field: SourceSearchField;

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

class HttpSourceSearchSnapshotDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpSourceSearchRuleDto)
  filters: HttpSourceSearchRuleDto[];
}

export class HttpCreateSourceSearchMetricDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpSourceSearchSnapshotDto)
  snapshot: HttpSourceSearchSnapshotDto;
}

