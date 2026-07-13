import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import {
  RecurringPurchaseSearchField,
  RecurringPurchaseSearchFields,
  RecurringPurchaseSearchOperator,
  RecurringPurchaseSearchOperators,
  RecurringPurchaseSearchRuleMode,
} from "../../../application/dtos/recurring-purchase-search/recurring-purchase-search-snapshot";

const RecurringPurchaseSearchRuleModes = {
  INCLUDE: "include",
  EXCLUDE: "exclude",
} as const;

class HttpRecurringPurchaseSearchRangeDto {
  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;
}

class HttpRecurringPurchaseSearchRuleDto {
  @IsString()
  @IsEnum(RecurringPurchaseSearchFields)
  field: RecurringPurchaseSearchField;

  @IsString()
  @IsEnum(RecurringPurchaseSearchOperators)
  operator: RecurringPurchaseSearchOperator;

  @IsOptional()
  @IsEnum(RecurringPurchaseSearchRuleModes)
  mode?: RecurringPurchaseSearchRuleMode;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => HttpRecurringPurchaseSearchRangeDto)
  range?: HttpRecurringPurchaseSearchRangeDto;
}

class HttpRecurringPurchaseSearchSnapshotDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpRecurringPurchaseSearchRuleDto)
  filters: HttpRecurringPurchaseSearchRuleDto[];
}

export class HttpCreateRecurringPurchaseSearchMetricDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @ValidateNested()
  @Type(() => HttpRecurringPurchaseSearchSnapshotDto)
  snapshot: HttpRecurringPurchaseSearchSnapshotDto;
}
