import { IsDateString, IsOptional, IsString, IsUUID } from "class-validator";

export class HttpPurchaseHistorySummaryQueryDto {
  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsDateString()
  eventFrom?: string;

  @IsOptional()
  @IsDateString()
  eventTo?: string;

  @IsOptional()
  @IsUUID()
  performedByUserId?: string;
}
