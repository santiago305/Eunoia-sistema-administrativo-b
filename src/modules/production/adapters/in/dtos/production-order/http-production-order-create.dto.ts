import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";

export class HttpCreateProductionOrderDto {
  @IsUUID()
  fromWarehouseId: string;

  @IsUUID()
  toWarehouseId: string;

  @IsUUID()
  serieId: string;

  @IsString()
  @IsOptional()
  reference: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  manufactureTime: number;
}
