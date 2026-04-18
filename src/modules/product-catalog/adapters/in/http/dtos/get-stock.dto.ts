import { IsOptional, IsUUID } from "class-validator";

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
