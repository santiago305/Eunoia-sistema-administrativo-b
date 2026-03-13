import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from "src/modules/catalog/domain/ports/product-recipe.repository";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/domain/ports/stock-item/stock-item.repository.port";

export interface RecipeConsumptionLine {
  stockItemId: string;
  locationId?: string;
  qty: number;
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
      throw new NotFoundException(
        {
          type:'error',
          message:'Orden de produccion no encontrada'
        }
      );
    }

    const { items } = result;

    const map = new Map<string, RecipeConsumptionLine>();

    const stockItemCache = new Map<string, string>();

    const getStockItemIdForVariant = async (variantId: string) => {
      const cached = stockItemCache.get(variantId);
      if (cached) return cached;
      const stockItem = await this.stockItemRepo.findByVariantId(variantId, tx);
      if (!stockItem?.stockItemId) {
        throw new NotFoundException({ type: "error", message: "Stock item de materia prima no encontrado" });
      }
      stockItemCache.set(variantId, stockItem.stockItemId);
      return stockItem.stockItemId;
    };

    const getVariantIdForFinishedItem = async (finishedItemId: string) => {
      const finishedItem = await this.stockItemRepo.findById(finishedItemId, tx);
      if (!finishedItem?.variantId) {
        throw new NotFoundException({ type: "error", message: "Stock item de producto terminado no encontrado" });
      }
      return finishedItem.variantId;
    };

    for (const item of items) {
      const finishedVariantId = await getVariantIdForFinishedItem(item.finishedItemId);
      const recipes = await this.recipeRepo.listByVariantId(finishedVariantId, tx);

      for (const r of recipes) {
        const qty = r.quantity * item.quantity;
        const loc = item.fromLocationId ?? undefined;
        const stockItemId = await getStockItemIdForVariant(r.primaVariantId);
        const key = `${stockItemId}::${loc ?? "null"}`;

        const current = map.get(key);
        if (current) {
          current.qty += qty;
        } else {
          map.set(key, {
            stockItemId,
            locationId: loc,
            qty,
          });
        }
      }
    }

    return Array.from(map.values());
  }
}
