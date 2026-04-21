import { Type } from "class-transformer";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import {
  PurchaseSearchField,
  PurchaseSearchFields,
  PurchaseSearchOperator,
  PurchaseSearchOperators,
  PurchaseSearchRuleMode,
} from "src/modules/purchases/application/dtos/purchase-search/purchase-search-snapshot";

const PurchaseSearchRuleModes = {
  INCLUDE: "include",
  EXCLUDE: "exclude",
} as const;

class HttpPurchaseSearchRangeDto {
  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;
}

class HttpPurchaseSearchRuleDto {
  @IsEnum(PurchaseSearchFields)
  field: PurchaseSearchField;

  @IsEnum(PurchaseSearchOperators)
  operator: PurchaseSearchOperator;

  @IsOptional()
  @IsEnum(PurchaseSearchRuleModes)
  mode?: PurchaseSearchRuleMode;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => HttpPurchaseSearchRangeDto)
  range?: HttpPurchaseSearchRangeDto;
}

class HttpPurchaseSearchSnapshotDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpPurchaseSearchRuleDto)
  filters: HttpPurchaseSearchRuleDto[];
}

export class HttpCreatePurchaseSearchMetricDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => HttpPurchaseSearchSnapshotDto)
  snapshot: HttpPurchaseSearchSnapshotDto;
}
