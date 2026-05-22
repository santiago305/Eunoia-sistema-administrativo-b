import { Type } from "class-transformer";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
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

class HttpPackSearchRuleDto {
  @IsEnum(PackSearchFields)
  field: PackSearchField;

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

class HttpPackSearchSnapshotDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpPackSearchRuleDto)
  filters: HttpPackSearchRuleDto[];
}

export class HttpCreatePackSearchMetricDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpPackSearchSnapshotDto)
  snapshot: HttpPackSearchSnapshotDto;
}

