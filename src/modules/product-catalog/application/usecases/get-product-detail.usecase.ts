import { Inject, Injectable } from "@nestjs/common";
import {
  PRODUCT_CATALOG_PRODUCT_REPOSITORY,
  ProductCatalogProductRepository,
} from "../../domain/ports/product.repository";

@Injectable()
export class GetProductCatalogProductDetail {
  constructor(
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly repo: ProductCatalogProductRepository,
  ) {}

  async execute(id: string, warehouseId?: string) {
    const detail = await this.repo.getDetail(id, warehouseId);
    if (!detail) {
      throw new Error("Producto no encontrado");
    }
    return detail;
  }
}
