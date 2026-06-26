import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsPositive, Max } from "class-validator";
import { RECURRING_STATUSES, RecurringStatus } from "../../../domain/value-objects/recurring-status";

export class HttpRecurringPurchaseListDto {
  @IsOptional()
  @IsEnum(RECURRING_STATUSES)
  status?: RecurringStatus;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(100)
  limit?: number = 20;
}
