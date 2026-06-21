import { IsOptional, IsUUID, IsInt, Min, Max, IsIn } from "class-validator";
import { Type } from "class-transformer";

export class HttpListPaymentsQueryDto {
  @IsOptional()
  @IsUUID()
  poId?: string;

  @IsOptional()
  @IsUUID()
  quotaId?: string;

  @IsOptional()
  @IsIn(["PENDING_APPROVAL", "APPROVED", "REJECTED"])
  status?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

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
