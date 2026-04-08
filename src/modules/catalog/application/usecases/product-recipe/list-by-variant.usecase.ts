import { Inject } from '@nestjs/common';
import { ListProductRecipeInput } from '../../dto/product-recipes/input/list-product-recipe';
import { ProductRecipeOutput } from '../../dto/product-recipes/output/product-recipe-out';
import { ProductRecipe } from 'src/modules/catalog/domain/entity/product-recipe';
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from '../../ports/product-recipe.repository';

export class ListProductRecipesByVariant {
  constructor(
    @Inject(PRODUCT_RECIPE_REPOSITORY)
    private readonly recipeRepo: ProductRecipeRepository,
  ) {}

  async execute(input: ListProductRecipeInput): Promise<ProductRecipeOutput[]> {
    const rows = await this.recipeRepo.listByFinishedItem(input.finishedType, input.finishedItemId);
    return rows.map((r: ProductRecipe) => ({
      id: r.recipeId,
      finishedType: r.finishedType,
      finishedItemId: r.finishedItemId,
      primaVariantId: r.primaVariantId,
      quantity: r.quantity,
      waste: r.waste,
    }));
  }
}
