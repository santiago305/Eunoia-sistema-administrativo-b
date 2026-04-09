import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CreateProductCatalogRecipe } from "src/modules/product-catalog/application/usecases/create-recipe.usecase";
import { GetProductCatalogRecipe } from "src/modules/product-catalog/application/usecases/get-recipe.usecase";
import { CreateProductCatalogRecipeDto } from "../dtos/create-recipe.dto";

@Controller("skus/:id/recipe")
@UseGuards(JwtAuthGuard)
export class ProductCatalogRecipeController {
  constructor(
    private readonly createRecipe: CreateProductCatalogRecipe,
    private readonly getRecipe: GetProductCatalogRecipe,
  ) {}

  @Get()
  get(@Param("id", ParseUUIDPipe) skuId: string) {
    return this.getRecipe.execute(skuId);
  }

  @Post()
  create(@Param("id", ParseUUIDPipe) skuId: string, @Body() dto: CreateProductCatalogRecipeDto) {
    return this.createRecipe.execute({ skuId, ...dto });
  }
}
