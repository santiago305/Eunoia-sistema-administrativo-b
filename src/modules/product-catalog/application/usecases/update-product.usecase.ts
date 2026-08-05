import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogProductNotFoundError } from "../errors/product-catalog-product-not-found.error";
import { ProductCatalogProductType } from "../../domain/value-objects/product-type";
import {
  PRODUCT_CATALOG_PRODUCT_REPOSITORY,
  ProductCatalogProductRepository,
} from "../../domain/ports/product.repository";
import { normalizeProductName } from "../../domain/value-objects/product-name";
import { PACK_REPOSITORY, PackRepository } from "src/modules/packs/domain/ports/pack.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "../../domain/ports/sku.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import {
  PRODUCT_CATALOG_EQUIVALENCE_REPOSITORY,
  ProductCatalogEquivalenceRepository,
} from "../../domain/ports/equivalence.repository";

@Injectable()
export class UpdateProductCatalogProduct {
  constructor(
    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly repo: ProductCatalogProductRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
    @Inject(PRODUCT_CATALOG_EQUIVALENCE_REPOSITORY)
    private readonly equivalenceRepo: ProductCatalogEquivalenceRepository,
    @Inject(PACK_REPOSITORY)
    private readonly packRepo: PackRepository,
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
  ) {}

  async getPackImpact(id: string) {
    const product = await this.repo.findById(id);
    if (!product) throw new NotFoundException(new ProductCatalogProductNotFoundError().message);
    const packs = product.type === ProductCatalogProductType.PRODUCT
      ? await this.packRepo.listActiveByProductId(id)
      : [];
    return { productId: id, productName: product.name, packs };
  }

  async execute(
    id: string,
    patch: {
      name?: string;
      description?: string | null;
      type?: ProductCatalogProductType;
      brand?: string | null;
      baseUnitId?: string | null;
      isActive?: boolean;
      isDeleted?: boolean;
      removeFromPacks?: boolean;
    },
  ) {
    const { removeFromPacks = false, ...productPatch } = patch;
    const normalizedPatch = productPatch.name === undefined
      ? productPatch
      : { ...productPatch, name: normalizeProductName(productPatch.name).displayName };

    if (!productPatch.isDeleted) {
      if (productPatch.baseUnitId !== undefined) {
        const product = await this.repo.findById(id);
        if (!product) throw new NotFoundException(new ProductCatalogProductNotFoundError().message);

        if (productPatch.baseUnitId !== product.baseUnitId) {
          const equivalences = await this.equivalenceRepo.listByProductId(id);
          if (equivalences.length > 0) {
            throw new ConflictException(
              "No se puede cambiar la unidad base mientras el producto tenga equivalencias registradas",
            );
          }
        }
      }

      const updated = await this.repo.update(id, normalizedPatch);
      if (!updated) throw new NotFoundException(new ProductCatalogProductNotFoundError().message);
      return updated;
    }

    const product = await this.repo.findById(id);
    if (!product) throw new NotFoundException(new ProductCatalogProductNotFoundError().message);
    const packs = product.type === ProductCatalogProductType.PRODUCT
      ? await this.packRepo.listActiveByProductId(id)
      : [];
    if (packs.length && !removeFromPacks) {
      throw new ConflictException({
        code: "PRODUCT_IN_ACTIVE_PACKS",
        message: "El producto pertenece a packs activos. Confirma para retirarlo de los packs y eliminarlo.",
        packs,
      });
    }

    return this.uow.runInTransaction(async (tx) => {
      const packChanges = packs.length
        ? await this.packRepo.removeProductFromActivePacks(id, tx)
        : [];
      await this.skuRepo.softDeleteByProductId(id, tx);
      const updated = await this.repo.update(
        id,
        { ...normalizedPatch, isActive: false, isDeleted: true },
        tx,
      );
      if (!updated) throw new NotFoundException(new ProductCatalogProductNotFoundError().message);
      return { ...updated, packChanges };
    });
  }
}
