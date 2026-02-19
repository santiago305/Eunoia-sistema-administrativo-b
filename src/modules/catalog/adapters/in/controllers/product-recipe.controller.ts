import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { CreateProductRecipe } from 'src/modules/catalog/application/usecases/product-recipe/create.usecase';
import { DeleteProductRecipe } from 'src/modules/catalog/application/usecases/product-recipe/delete.usecase';
import { ListProductRecipesByVariant } from 'src/modules/catalog/application/usecases/product-recipe/list-by-variant.usecase';
import { HttpCreateProductRecipeDto } from '../dtos/product-recipes/http-product-recipe-create.dto';
import { ListProductRecipesQueryDto } from '../dtos/product-recipes/http-product-recipe-list.dto';

@Controller('catalog/product-recipes')
@UseGuards(JwtAuthGuard)
export class ProductRecipesController {
  constructor(
    private readonly createRecipe: CreateProductRecipe,
    private readonly deleteRecipe: DeleteProductRecipe,
    private readonly listByVariant: ListProductRecipesByVariant,
  ) {}

  @Post()
  create(@Body() dto: HttpCreateProductRecipeDto) {
    return this.createRecipe.execute(dto);
  }

  @Get()
  list(@Query() query: ListProductRecipesQueryDto) {
    return this.listByVariant.execute({ variantId: query.variantId });
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deleteRecipe.execute(id);
  }
}
