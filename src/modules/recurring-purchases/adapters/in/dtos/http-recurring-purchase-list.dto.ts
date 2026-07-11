import { plainToInstance, Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsOptional, IsPositive, IsString, IsUUID, Max, ValidateNested } from "class-validator";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PurchaseType } from "src/modules/purchases/domain/value-objects/purchase-type";
import { RECURRING_STATUSES, RecurringStatus } from "../../../domain/value-objects/recurring-status";
import { RECURRING_FREQUENCIES, RecurringFrequency } from "../../../domain/value-objects/recurring-frequency";
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

const toStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const normalized = raw.map((item) => String(item).trim()).filter(Boolean);
  return normalized.length ? normalized : undefined;
};

const toFiltersArray = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => plainToInstance(HttpRecurringPurchaseSearchRuleDto, item));
  }
  if (typeof value !== "string") return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => plainToInstance(HttpRecurringPurchaseSearchRuleDto, item))
      : undefined;
  } catch {
    return undefined;
  }
};

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

export class HttpRecurringPurchaseListDto {
  @IsOptional()
  @IsEnum(RECURRING_STATUSES)
  status?: RecurringStatus;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsEnum(RECURRING_STATUSES, { each: true })
  statuses?: RecurringStatus[];

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID("4", { each: true })
  supplierIds?: string[];

  @IsOptional()
  @IsEnum(RECURRING_FREQUENCIES)
  frequency?: RecurringFrequency;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsEnum(RECURRING_FREQUENCIES, { each: true })
  frequencies?: RecurringFrequency[];

  @IsOptional()
  @IsEnum(CurrencyType)
  currency?: CurrencyType;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsEnum(CurrencyType, { each: true })
  currencies?: CurrencyType[];

  @IsOptional()
  @IsEnum(PurchaseType)
  purchaseType?: PurchaseType;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsEnum(PurchaseType, { each: true })
  purchaseTypes?: PurchaseType[];

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => toFiltersArray(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpRecurringPurchaseSearchRuleDto)
  filters?: HttpRecurringPurchaseSearchRuleDto[];

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(100)
  limit?: number = 25;
}
