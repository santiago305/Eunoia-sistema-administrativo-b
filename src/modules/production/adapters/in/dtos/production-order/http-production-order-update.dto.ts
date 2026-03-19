import { IsArray, IsDate, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { HttpAddProductionOrderItemDto } from "./http-production-order-item-create.dto";

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpAddProductionOrderItemDto)
  items: HttpAddProductionOrderItemDto[];
}
