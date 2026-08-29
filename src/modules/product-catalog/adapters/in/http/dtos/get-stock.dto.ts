import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsOptional, IsUUID, ValidateNested } from "class-validator";

export class GetStockDto {
  @IsUUID()
  warehouseId: string;
  
  @IsUUID()
  skuId: string;
  
  @IsOptional()
  @IsUUID()
  locationId?: string;
}

export class GetSkuStockSnapshotDto {
  @IsUUID()
  warehouseId: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}

// Backward-compatible export name used in controllers
export { GetStockDto as getStockDto };

export class GetStockBatchDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => GetStockDto)
  items: GetStockDto[];
}
