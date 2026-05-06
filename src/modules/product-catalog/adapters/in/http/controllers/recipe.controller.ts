import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateProductCatalogRecipe } from "src/modules/product-catalog/application/usecases/create-recipe.usecase";
import { DeleteProductCatalogRecipeItem } from "src/modules/product-catalog/application/usecases/delete-recipe-item.usecase";
import { GetProductCatalogRecipe } from "src/modules/product-catalog/application/usecases/get-recipe.usecase";
import { UpdateProductCatalogRecipe } from "src/modules/product-catalog/application/usecases/update-recipe.usecase";
import { CreateProductCatalogRecipeDto } from "../dtos/create-recipe.dto";
import { UpdateProductCatalogRecipeDto } from "../dtos/update-recipe.dto";

@Controller("skus/:id/recipe")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class ProductCatalogRecipeController {
  constructor(
    private readonly createRecipe: CreateProductCatalogRecipe,
    private readonly getRecipe: GetProductCatalogRecipe,
    private readonly updateRecipe: UpdateProductCatalogRecipe,
    private readonly deleteRecipeItem: DeleteProductCatalogRecipeItem,
  ) {}

  @RequirePermissions("catalog.read")
  @Get()
  get(@Param("id", ParseUUIDPipe) skuId: string) {
    return this.getRecipe.execute(skuId);
  }

  @RequirePermissions("catalog.manage")
  @Post()
  create(@Param("id", ParseUUIDPipe) skuId: string, @Body() dto: CreateProductCatalogRecipeDto) {
    return this.createRecipe.execute({ skuId, ...dto });
  }

  @RequirePermissions("catalog.manage")
  @Patch()
  update(@Param("id", ParseUUIDPipe) skuId: string, @Body() dto: UpdateProductCatalogRecipeDto) {
    return this.updateRecipe.execute({ skuId, ...dto });
  }

  @RequirePermissions("catalog.manage")
  @Delete("items/:itemId")
  deleteItem(
    @Param("id", ParseUUIDPipe) skuId: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
  ) {
    return this.deleteRecipeItem.execute(skuId, itemId);
  }
}
