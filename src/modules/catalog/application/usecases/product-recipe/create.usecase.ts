import { BadRequestException, Inject } from '@nestjs/common';
import { ProductRecipe } from 'src/modules/catalog/domain/entity/product-recipe';
import { CreateProductRecipeInput } from '../../dto/product-recipes/input/create-product-recipe';
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from '../../ports/product-recipe.repository';

export class CreateProductRecipe {
  constructor(
    @Inject(PRODUCT_RECIPE_REPOSITORY)
    private readonly recipeRepo: ProductRecipeRepository,
  ) {}

  async execute(input: CreateProductRecipeInput): Promise<{type:string,message:string}> {
    const recipe = new ProductRecipe(
      undefined,
      input.finishedVariantId,
      input.primaVariantId,
      input.quantity,
      input.waste,
    );

    try {
      await this.recipeRepo.create(recipe);
    } catch {
      throw new BadRequestException('Error al crear receta');
    }

    return {
      type: 'success',
      message: 'Receta creada con éxito'
    };
  }
}
