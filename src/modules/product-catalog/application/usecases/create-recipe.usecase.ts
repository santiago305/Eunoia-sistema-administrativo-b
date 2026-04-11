import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogSkuNotFoundError } from "../errors/product-catalog-sku-not-found.error";
import { ProductCatalogRecipeItem } from "../../domain/entities/recipe-item";
import { ProductCatalogRecipe } from "../../domain/entities/recipe";
import { PRODUCT_CATALOG_RECIPE_REPOSITORY, ProductCatalogRecipeRepository } from "../../domain/ports/recipe.repository";
import { PRODUCT_CATALOG_SKU_REPOSITORY, ProductCatalogSkuRepository } from "../../domain/ports/sku.repository";

@Injectable()
export class CreateProductCatalogRecipe {
  constructor(
    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,
    @Inject(PRODUCT_CATALOG_RECIPE_REPOSITORY)
    private readonly recipeRepo: ProductCatalogRecipeRepository,
  ) {}

  async execute(input: {
    skuId: string;
    yieldQuantity: number;
    notes?: string | null;
    items: Array<{ materialSkuId: string; quantity: number; unitId: string }>;
  }) {
    const sku = await this.skuRepo.findById(input.skuId);
    if (!sku) throw new NotFoundException(new ProductCatalogSkuNotFoundError().message);
    const current = await this.recipeRepo.findActiveBySkuId(input.skuId);
    const version = (current?.recipe.version ?? 0) + 1;
    return this.recipeRepo.create({
      recipe: new ProductCatalogRecipe(undefined, input.skuId, version, input.yieldQuantity, input.notes ?? null, true),
      items: input.items.map(
        (item) => new ProductCatalogRecipeItem(undefined, "", item.materialSkuId, item.quantity, item.unitId),
      ),
    });
  }
}
