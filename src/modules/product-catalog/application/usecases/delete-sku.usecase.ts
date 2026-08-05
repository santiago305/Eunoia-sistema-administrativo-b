import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogSkuNotFoundError } from "../errors/product-catalog-sku-not-found.error";
import {
  PRODUCT_CATALOG_SKU_REPOSITORY,
  ProductCatalogSkuRepository,
} from "../../domain/ports/sku.repository";
import { PACK_REPOSITORY, PackRepository } from "src/modules/packs/domain/ports/pack.repository";

@Injectable()
export class DeleteProductCatalogSku {
  constructor(
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly repo: ProductCatalogSkuRepository,
    @Inject(PACK_REPOSITORY)
    private readonly packRepo: PackRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const packs = await this.packRepo.listActiveBySkuId(id);
    if (packs.length) {
      throw new ConflictException({
        code: "SKU_IN_ACTIVE_PACKS",
        message: "No se puede eliminar la variante porque pertenece a packs activos.",
        packs,
      });
    }
    const deleted = await this.repo.softDelete(id);
    if (!deleted) {
      throw new NotFoundException(new ProductCatalogSkuNotFoundError().message);
    }
  }
}
