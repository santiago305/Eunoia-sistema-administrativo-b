import { ProductCatalogRecipe } from "../entities/recipe";
import { ProductCatalogRecipeItem } from "../entities/recipe-item";

export const PRODUCT_CATALOG_RECIPE_REPOSITORY = Symbol("PRODUCT_CATALOG_RECIPE_REPOSITORY");

export interface ProductCatalogRecipeWithItems {
  recipe: ProductCatalogRecipe;
  items: ProductCatalogRecipeItem[];
}

export interface ProductCatalogRecipeRepository {
  create(input: { recipe: ProductCatalogRecipe; items: ProductCatalogRecipeItem[] }): Promise<ProductCatalogRecipeWithItems>;
  findActiveBySkuId(skuId: string): Promise<ProductCatalogRecipeWithItems | null>;
}
