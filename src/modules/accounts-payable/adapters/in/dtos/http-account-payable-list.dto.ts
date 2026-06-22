import { IsIn, IsInt, IsOptional, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";
import { PayableStatus } from "src/modules/accounts-payable/domain/value-objects/payable-status";

const PAYABLE_STATUSES: PayableStatus[] = ["PENDING", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"];

export class HttpAccountPayableListDto {
  @IsOptional()
  @IsIn(PAYABLE_STATUSES)
  status?: PayableStatus;

  @IsOptional()
  @IsUUID()
  purchaseId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

