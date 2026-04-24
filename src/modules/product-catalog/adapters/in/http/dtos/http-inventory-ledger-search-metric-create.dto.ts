import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import type { InventoryLedgerSearchSnapshot } from "src/modules/product-catalog/application/dtos/inventory-ledger-search/inventory-ledger-search-snapshot";

export class HttpCreateInventoryLedgerSearchMetricDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(ProductCatalogProductType)
  productType?: ProductCatalogProductType;

  @IsOptional()
  @IsObject()
  snapshot?: InventoryLedgerSearchSnapshot;
}

