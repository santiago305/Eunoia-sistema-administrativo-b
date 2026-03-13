import { IsDate, IsOptional, IsString, IsUUID } from "class-validator";
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
  @Type(() => Date)
  @IsDate()
  manufactureDate?: Date;
}
