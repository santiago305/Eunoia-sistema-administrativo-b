import { IsOptional, IsUUID } from "class-validator";

export class ListSkuStockSnapshotsDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}

