import {  IsOptional, IsUUID } from "class-validator";

export class getStockDto{
  @IsUUID()
  warehouseId: string;
  
  @IsUUID()
  skuId: string;
  
  @IsOptional()
  @IsUUID()
  locationId?: string;
}
