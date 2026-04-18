import { IsOptional, IsEnum, IsUUID, IsDateString, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";

export class HttpListProductionOrdersQueryDto {
  @IsOptional()
  @IsEnum(ProductionStatus)
  status?: ProductionStatus;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  skuId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

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
