import { Type } from "class-transformer";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import {
  IncomeSearchField,
  IncomeSearchFields,
  IncomeSearchOperator,
  IncomeSearchOperators,
  IncomeSearchRuleMode,
} from "src/modules/income/application/dtos/income-search/income-search-snapshot";

const IncomeSearchRuleModes = {
  INCLUDE: "include",
  EXCLUDE: "exclude",
} as const;

class HttpIncomeSearchRuleDto {
  @IsEnum(IncomeSearchFields)
  field: IncomeSearchField;

  @IsEnum(IncomeSearchOperators)
  operator: IncomeSearchOperator;

  @IsOptional()
  @IsEnum(IncomeSearchRuleModes)
  mode?: IncomeSearchRuleMode;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}

class HttpIncomeSearchSnapshotDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpIncomeSearchRuleDto)
  filters: HttpIncomeSearchRuleDto[];
}

export class HttpCreateIncomeSearchMetricDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpIncomeSearchSnapshotDto)
  snapshot: HttpIncomeSearchSnapshotDto;
}
