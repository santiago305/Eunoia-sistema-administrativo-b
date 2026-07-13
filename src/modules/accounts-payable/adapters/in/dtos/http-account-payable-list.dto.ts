import { IsArray, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { Transform, Type } from "class-transformer";
import { PayableStatus } from "src/modules/accounts-payable/domain/value-objects/payable-status";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

const PAYABLE_STATUSES: PayableStatus[] = ["PENDING", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"];

const toStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const values = raw.map((item) => String(item).trim()).filter(Boolean);
  return values.length ? Array.from(new Set(values)) : undefined;
};

export class HttpAccountPayableListDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(PAYABLE_STATUSES)
  status?: PayableStatus;

  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsIn(PAYABLE_STATUSES, { each: true })
  statuses?: PayableStatus[];

  @IsOptional()
  @IsUUID()
  purchaseId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsEnum(CurrencyType)
  currency?: CurrencyType;

  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @IsOptional()
  @IsDateString()
  dueTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountPendingMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountPendingMax?: number;

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

