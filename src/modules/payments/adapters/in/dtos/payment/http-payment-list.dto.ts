import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";

const PAYMENT_STATUSES = ["SCHEDULED", "PENDING_APPROVAL", "APPROVED", "REJECTED"] as const;

const toStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const values = raw.map((item) => String(item).trim()).filter(Boolean);
  return values.length ? Array.from(new Set(values)) : undefined;
};

const toOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
};

export class HttpListPaymentsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsUUID()
  poId?: string;

  @IsOptional()
  @IsUUID()
  quotaId?: string;

  @IsOptional()
  @IsUUID()
  accountPayableId?: string;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  status?: "SCHEDULED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsIn(PAYMENT_STATUSES, { each: true })
  statuses?: Array<"SCHEDULED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED">;

  @IsOptional()
  @IsEnum(CurrencyType)
  currency?: CurrencyType;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID("4", { each: true })
  paymentMethodIds?: string[];

  @IsOptional()
  @IsUUID()
  companyPaymentAccountId?: string;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsUUID("4", { each: true })
  companyPaymentAccountIds?: string[];

  @IsOptional()
  @IsEnum(PayDocType)
  fromDocumentType?: PayDocType;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsDateString()
  scheduledFrom?: string;

  @IsOptional()
  @IsDateString()
  scheduledTo?: string;

  @IsOptional()
  @IsDateString()
  paidFrom?: string;

  @IsOptional()
  @IsDateString()
  paidTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountMax?: number;

  @IsOptional()
  @IsUUID()
  requestedByUserId?: string;

  @IsOptional()
  @IsUUID()
  approvedByUserId?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  hasEvidence?: boolean;

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
