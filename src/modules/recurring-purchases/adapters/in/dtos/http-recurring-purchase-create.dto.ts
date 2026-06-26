import { Type } from "class-transformer";
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PurchaseType } from "src/modules/purchases/domain/value-objects/purchase-type";
import { RECURRING_FREQUENCIES, RecurringFrequency } from "../../../domain/value-objects/recurring-frequency";

export class HttpRecurringPurchaseCreateDto {
  @IsUUID()
  supplierId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(RECURRING_FREQUENCIES)
  frequency: RecurringFrequency;

  @IsOptional()
  @IsEnum(PurchaseType)
  purchaseType?: PurchaseType;

  @IsEnum(CurrencyType)
  currency: CurrencyType;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  nextDueDate?: string;

  @IsOptional()
  @IsArray()
  reminderDaysBefore?: number[];
}
