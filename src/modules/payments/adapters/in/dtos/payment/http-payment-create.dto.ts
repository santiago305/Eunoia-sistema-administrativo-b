import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";

export class HttpCreatePaymentDto {
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
  quotaId?: string;

  @IsOptional()
  @IsUUID()
  poId: string;
}
