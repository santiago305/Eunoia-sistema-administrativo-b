import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { ProductRecipe } from "../../domain/entity/product-recipe";

export const PRODUCT_RECIPE_REPOSITORY = Symbol("PRODUCT_RECIPE_REPOSITORY");

export interface ProductRecipeRepository {
  create(recipe: ProductRecipe, tx?: TransactionContext): Promise<ProductRecipe>;
  listByFinishedItem(
    finishedType: StockItemType,
    finishedItemId: string,
    tx?: TransactionContext,
  ): Promise<ProductRecipe[]>;
  listByVariantId(variantId: string, tx?: TransactionContext): Promise<ProductRecipe[]>;
  listByProductId(productId: string, tx?: TransactionContext): Promise<ProductRecipe[]>;
  listByItemId(itemId: string, tx?: TransactionContext): Promise<ProductRecipe[]>;
  findById(id: string, tx?: TransactionContext): Promise<ProductRecipe | null>;
  deleteById(id: string, tx?: TransactionContext): Promise<void>;
}
