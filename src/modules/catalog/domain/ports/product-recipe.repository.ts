import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { ProductRecipe } from "../entity/product-recipe";

export const PRODUCT_RECIPE_REPOSITORY = Symbol("PRODUCT_RECIPE_REPOSITORY");

export interface ProductRecipeRepository {
  create(recipe: ProductRecipe, tx?: TransactionContext): Promise<ProductRecipe>;
  listByVariantId(variantId: string, tx?: TransactionContext): Promise<ProductRecipe[]>;
  findById(id: string, tx?: TransactionContext): Promise<ProductRecipe | null>;
  deleteById(id: string, tx?: TransactionContext): Promise<void>;
}
