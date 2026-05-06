import { IsDateString, IsOptional, IsString, IsUUID } from "class-validator";

export class HttpPurchaseHistoryListQueryDto {
  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsUUID()
  performedByUserId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

