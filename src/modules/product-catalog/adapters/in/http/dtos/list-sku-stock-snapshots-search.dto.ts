import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";

export class ListSkuStockSnapshotsSearchDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  isActive?: string;

  @IsOptional()
  @IsUUID()
  skuId?: string;

  @IsOptional()
  @IsEnum(ProductCatalogProductType)
  productType?: ProductCatalogProductType;

  // Compatibilidad: este endpoint NO pagina, pero se aceptan si el front los envía.
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
