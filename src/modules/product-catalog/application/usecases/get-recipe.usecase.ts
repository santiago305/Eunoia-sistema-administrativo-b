import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogRecipeNotFoundError } from "../errors/product-catalog-recipe-not-found.error";
import { PRODUCT_CATALOG_RECIPE_REPOSITORY, ProductCatalogRecipeRepository } from "../../domain/ports/recipe.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "../../domain/ports/sku.repository";

@Injectable()
export class GetProductCatalogRecipe {
  constructor(
    @Inject(PRODUCT_CATALOG_RECIPE_REPOSITORY)
    private readonly repo: ProductCatalogRecipeRepository,
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
  ) {}

  async execute(skuId: string) {
    const recipe = await this.repo.findActiveBySkuId(skuId);
    if (!recipe) throw new NotFoundException(new ProductCatalogRecipeNotFoundError().message);
    const materialSkuIds = Array.from(new Set(recipe.items.map((item) => item.materialSkuId)));
    const materialSkus = await this.skuRepo.findByIds(materialSkuIds);
    const materialSkuById = new Map(materialSkus.map((item) => [item.sku.id, item]));

    return {
      recipe: recipe.recipe,
      items: recipe.items.map((item) => ({
        id: item.id,
        recipeId: item.recipeId,
        materialSkuId: item.materialSkuId,
        quantity: item.quantity,
        unitId: item.unitId,
        materialSku: materialSkuById.get(item.materialSkuId) ?? null,
      })),
    };
  }
}
