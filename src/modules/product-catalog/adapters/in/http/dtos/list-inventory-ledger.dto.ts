import { IsOptional, IsString, IsUUID } from "class-validator";

export class ListProductCatalogInventoryLedgerDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;
  
  @IsOptional()
  @IsUUID()
  skuId?: string;
}

