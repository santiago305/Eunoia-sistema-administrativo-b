import { Inject, Injectable } from "@nestjs/common";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "../../domain/ports/inventory.repository";

@Injectable()
export class ListProductCatalogInventoryBySku {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly repo: ProductCatalogInventoryRepository,
  ) {}

  execute(skuId: string) {
    return this.repo.listBySkuId(skuId);
  }
}
