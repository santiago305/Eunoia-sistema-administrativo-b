import { Type } from "class-transformer";
import { IsBooleanString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";

export class ListLocationQueryDto {
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

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
