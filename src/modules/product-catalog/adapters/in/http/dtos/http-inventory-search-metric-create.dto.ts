import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import type { InventorySearchSnapshot } from "src/modules/product-catalog/application/dtos/inventory-search/inventory-search-snapshot";

export class HttpCreateInventorySearchMetricDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(ProductCatalogProductType)
  productType?: ProductCatalogProductType;

  @IsOptional()
  @IsObject()
  snapshot?: InventorySearchSnapshot;
}
