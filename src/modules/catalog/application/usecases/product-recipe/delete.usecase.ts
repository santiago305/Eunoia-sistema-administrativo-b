import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from '../../ports/product-recipe.repository';

export class DeleteProductRecipe {
  constructor(
    @Inject(PRODUCT_RECIPE_REPOSITORY)
    private readonly recipeRepo: ProductRecipeRepository,
  ) {}

  async execute(id: string): Promise<{ type: string; message: string }> {
    const row = await this.recipeRepo.findById(id);
    if (!row) {
      throw new NotFoundException('Receta no encontrada');
    }

    try {
      await this.recipeRepo.deleteById(id);
    } catch {
      throw new BadRequestException('Error al borrar receta');
    }

    return {
      type: 'success',
      message: 'Receta borrada con éxito',
    };
  }
}
