import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogRecipe } from "../../domain/entities/recipe";
import { ProductCatalogRecipeItem } from "../../domain/entities/recipe-item";
import { PRODUCT_CATALOG_RECIPE_REPOSITORY, ProductCatalogRecipeRepository } from "../../domain/ports/recipe.repository";

@Injectable()
export class UpdateProductCatalogRecipe {
  constructor(
    @Inject(PRODUCT_CATALOG_RECIPE_REPOSITORY)
    private readonly repo: ProductCatalogRecipeRepository,
  ) {}

  async execute(input: {
    skuId: string;
    yieldQuantity?: number;
    notes?: string | null;
    items?: Array<{ materialSkuId: string; quantity: number; unitId: string }>;
  }) {
    const current = await this.repo.findActiveBySkuId(input.skuId);
    if (!current) throw new NotFoundException("Recipe not found");

    const nextItems = (input.items ?? current.items).map(
      (item) =>
        new ProductCatalogRecipeItem(
          undefined,
          "",
          item.materialSkuId,
          item.quantity,
          item.unitId,
        ),
    );

    return this.repo.create({
      recipe: new ProductCatalogRecipe(
        undefined,
        input.skuId,
        current.recipe.version + 1,
        input.yieldQuantity ?? current.recipe.yieldQuantity,
        input.notes !== undefined ? input.notes ?? null : current.recipe.notes,
        true,
      ),
      items: nextItems,
    });
  }
}
