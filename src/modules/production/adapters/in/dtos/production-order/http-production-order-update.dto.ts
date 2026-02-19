import { IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";

export class HttpUpdateProductionOrderDto {
  @IsOptional()
  @IsUUID()
  fromWarehouseId?: string;

  @IsOptional()
  @IsUUID()
  toWarehouseId?: string;

  @IsOptional()
  @IsUUID()
  serieId?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  manufactureTime?: number;
}
