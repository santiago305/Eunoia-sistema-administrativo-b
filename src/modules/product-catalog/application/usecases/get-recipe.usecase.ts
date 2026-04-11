import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogRecipeNotFoundError } from "../errors/product-catalog-recipe-not-found.error";
import { PRODUCT_CATALOG_RECIPE_REPOSITORY, ProductCatalogRecipeRepository } from "../../domain/ports/recipe.repository";

@Injectable()
export class GetProductCatalogRecipe {
  constructor(
    @Inject(PRODUCT_CATALOG_RECIPE_REPOSITORY)
    private readonly repo: ProductCatalogRecipeRepository,
  ) {}

  async execute(skuId: string) {
    const recipe = await this.repo.findActiveBySkuId(skuId);
    if (!recipe) throw new NotFoundException(new ProductCatalogRecipeNotFoundError().message);
    return recipe;
  }
}
