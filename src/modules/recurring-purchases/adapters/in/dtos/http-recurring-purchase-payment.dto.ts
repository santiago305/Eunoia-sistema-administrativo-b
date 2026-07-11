import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

export class HttpRecurringPurchasePaymentDto {
  @IsString()
  method: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  operationNumber?: string;

  @IsEnum(CurrencyType)
  currency: CurrencyType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsUUID()
  companyPaymentAccountId?: string;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsUUID()
  paymentEvidenceFileId?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  cardLastFour?: string;

  @IsOptional()
  @IsString()
  operationCode?: string;

  @IsOptional()
  @IsBoolean()
  isPartial?: boolean;
}
