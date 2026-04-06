import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from "src/modules/catalog/application/ports/product-recipe.repository";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/application/ports/stock-item.repository.port";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { ProductionOrderNotFoundApplicationError } from "../../errors/production-order-not-found.error";

export interface RecipeConsumptionLine {
  stockItemId: string;
  locationId?: string;
  qty: number;
  wasteQty?: number;
}

@Injectable()
export class BuildConsumptionFromRecipesUseCase {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(PRODUCT_RECIPE_REPOSITORY)
    private readonly recipeRepo: ProductRecipeRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
  ) {}

  async execute(
    params: { productionId: string },
    tx: TransactionContext,
  ): Promise<RecipeConsumptionLine[]> {
    const result = await this.orderRepo.getByIdWithItems(params.productionId, tx);
    if (!result) {
      throw new NotFoundException(new ProductionOrderNotFoundApplicationError().message);
    }

    const map = new Map<string, RecipeConsumptionLine>();
    const stockItemCache = new Map<string, string>();

    const getStockItemIdForVariant = async (itemId: string) => {
      const cached = stockItemCache.get(itemId);
      if (cached) return cached;

      const stockItem = await this.stockItemRepo.findByVariantId(itemId, tx);
      if (!stockItem?.stockItemId) {
        throw new NotFoundException("Stock item de materia prima no encontrado");
      }

      stockItemCache.set(itemId, stockItem.stockItemId);
      return stockItem.stockItemId;
    };

    const getVariantIdForFinishedItem = async (finishedItemId: string) => {
      const finishedItem = await this.stockItemRepo.findById(finishedItemId, tx);
      if (!finishedItem?.variantId) {
        throw new NotFoundException("Stock item de producto terminado no encontrado");
      }
      return finishedItem.variantId;
    };

    for (const item of result.items) {
      const finishedVariantId = await getVariantIdForFinishedItem(item.finishedItemId);
      const recipes = await this.recipeRepo.listByVariantId(finishedVariantId, tx);

      for (const recipe of recipes) {
        const qty = recipe.quantity * item.quantity;
        const locationId = item.fromLocationId ?? undefined;
        const stockItemId = await getStockItemIdForVariant(recipe.primaVariantId);
        const key = `${stockItemId}::${locationId ?? "null"}`;

        const current = map.get(key);
        if (current) {
          current.qty += qty;
        } else {
          map.set(key, {
            stockItemId,
            locationId,
            qty,
          });
        }
      }
    }

    return Array.from(map.values());
  }
}
