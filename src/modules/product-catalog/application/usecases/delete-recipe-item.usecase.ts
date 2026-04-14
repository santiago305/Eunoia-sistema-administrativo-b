import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogRecipe } from "../../domain/entities/recipe";
import { ProductCatalogRecipeItem } from "../../domain/entities/recipe-item";
import { PRODUCT_CATALOG_RECIPE_REPOSITORY, ProductCatalogRecipeRepository } from "../../domain/ports/recipe.repository";
import { successResponse } from "src/shared/response-standard/response";

@Injectable()
export class DeleteProductCatalogRecipeItem {
  constructor(
    @Inject(PRODUCT_CATALOG_RECIPE_REPOSITORY)
    private readonly repo: ProductCatalogRecipeRepository,
  ) {}

  async execute(skuId: string, itemId: string) {
    const current = await this.repo.findActiveBySkuId(skuId);
    if (!current) throw new NotFoundException("Recipe not found");

    const item = current.items.find((row) => row.id === itemId);
    if (!item) throw new NotFoundException("Recipe item not found");

    const nextItems = current.items
      .filter((row) => row.id !== itemId)
      .map(
        (row) =>
          new ProductCatalogRecipeItem(
            undefined,
            "",
            row.materialSkuId,
            row.quantity,
            row.unitId,
          ),
      );

    const updated = await this.repo.create({
      recipe: new ProductCatalogRecipe(
        undefined,
        skuId,
        current.recipe.version + 1,
        current.recipe.yieldQuantity,
        current.recipe.notes,
        true,
      ),
      items: nextItems,
    });

    return successResponse("Recipe item deleted", updated);
  }
}
