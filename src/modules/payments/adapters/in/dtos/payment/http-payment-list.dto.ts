import { IsOptional, IsUUID, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class HttpListPaymentsQueryDto {
  @IsOptional()
  @IsUUID()
  poId?: string;

  @IsOptional()
  @IsUUID()
  quotaId?: string;

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
