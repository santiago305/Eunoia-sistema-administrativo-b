import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from "class-validator";
import { plainToInstance, Transform, Type } from "class-transformer";
import { PaymentFormType } from "src/modules/purchases/domain/value-objects/payment-form-type";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";
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

const toStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const normalized = raw.map((item) => String(item).trim()).filter(Boolean);
  return normalized.length ? normalized : undefined;
};

const toFiltersArray = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => plainToInstance(HttpPurchaseSearchRuleDto, item));
  }
  if (typeof value !== "string") return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => plainToInstance(HttpPurchaseSearchRuleDto, item))
      : undefined;
  } catch {
    return undefined;
  }
};

class HttpPurchaseSearchRangeDto {
  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;
}

class HttpPurchaseSearchRuleDto {
  @IsString()
  @IsEnum(PurchaseSearchFields)
  field: PurchaseSearchField;

  @IsString()
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

export class HttpListPurchaseOrdersQueryDto {
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID("4", { each: true })
  supplierIds?: string[];

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID("4", { each: true })
  warehouseIds?: string[];

  @IsOptional()
  @IsEnum(VoucherDocType)
  documentType?: VoucherDocType;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsEnum(VoucherDocType, { each: true })
  documentTypes?: VoucherDocType[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsEnum(PurchaseOrderStatus, { each: true })
  statuses?: PurchaseOrderStatus[];

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsEnum(PaymentFormType, { each: true })
  paymentForms?: PaymentFormType[];

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => toFiltersArray(value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpPurchaseSearchRuleDto)
  filters?: HttpPurchaseSearchRuleDto[];

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

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
}
