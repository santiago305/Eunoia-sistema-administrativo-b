import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { PaymentType } from "src/modules/payments/domain/value-objects/payment-type";

export class HttpCreatePaymentDto {
  @IsEnum(PaymentType)
  method: PaymentType;

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
  quotaId?: string;

  @IsOptional()
  @IsUUID()
  poId: string;
}
