import { IsArray, IsDate, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { HttpAddProductionOrderItemDto } from "./http-production-order-item-create.dto";

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

  @Type(() => Date)
  @IsDate()
  manufactureDate: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HttpAddProductionOrderItemDto)
  items: HttpAddProductionOrderItemDto[];
}
