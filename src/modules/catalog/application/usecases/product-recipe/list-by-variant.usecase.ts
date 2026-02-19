import { Inject } from '@nestjs/common';
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from 'src/modules/catalog/domain/ports/product-recipe.repository';
import { VariantId } from 'src/modules/inventory/domain/value-objects/ids';
import { ListProductRecipeInput } from '../../dto/product-recipes/input/list-product-recipe';
import { ProductRecipeOutput } from '../../dto/product-recipes/output/product-recipe-out';
import { ProductRecipe } from 'src/modules/catalog/domain/entity/product-recipe';

export class ListProductRecipesByVariant {
  constructor(
    @Inject(PRODUCT_RECIPE_REPOSITORY)
    private readonly recipeRepo: ProductRecipeRepository,
  ) {}

  async execute(input: ListProductRecipeInput): Promise<ProductRecipeOutput[]> {
    const rows = await this.recipeRepo.listByVariantId(new VariantId(input.variantId));
    return rows.map((r: ProductRecipe) => ({
      id: r.recipeId,
      finishedVariantId: r.finishedVariantId,
      primaVariantId: r.primaVariantId,
      quantity: r.quantity,
      waste: r.waste,
    }));
  }
}
