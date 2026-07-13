import { Type } from "class-transformer";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import {
  PaymentSearchField,
  PaymentSearchFields,
  PaymentSearchOperator,
  PaymentSearchOperators,
  PaymentSearchRuleMode,
} from "src/modules/payments/application/dtos/payment-search/payment-search-snapshot";

const PaymentSearchRuleModes = {
  INCLUDE: "include",
  EXCLUDE: "exclude",
} as const;

class HttpPaymentSearchRangeDto {
  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;
}

class HttpPaymentSearchRuleDto {
  @IsEnum(PaymentSearchFields)
  field: PaymentSearchField;

  @IsEnum(PaymentSearchOperators)
  operator: PaymentSearchOperator;

  @IsOptional()
  @IsEnum(PaymentSearchRuleModes)
  mode?: PaymentSearchRuleMode;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => HttpPaymentSearchRangeDto)
  range?: HttpPaymentSearchRangeDto;
}

class HttpPaymentSearchSnapshotDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpPaymentSearchRuleDto)
  filters: HttpPaymentSearchRuleDto[];
}

export class HttpCreatePaymentSearchMetricDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpPaymentSearchSnapshotDto)
  snapshot: HttpPaymentSearchSnapshotDto;
}
