import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from "src/modules/catalog/domain/ports/product-recipe.repository";
import { VariantId } from "src/modules/inventory/domain/value-objects/ids";
import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";

export interface RecipeConsumptionLine {
  variantId: string;
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

    for (const item of items) {
      const recipes = await this.recipeRepo.listByVariantId(
        new VariantId(item.finishedVariantId),
        tx,
      );

      for (const r of recipes) {
        const qty = r.quantity * item.quantity;
        const loc = item.fromLocationId ?? undefined;
        const key = `${r.primaVariantId}::${loc ?? "null"}`;

        const current = map.get(key);
        if (current) {
          current.qty += qty;
        } else {
          map.set(key, {
            variantId: r.primaVariantId,
            locationId: loc,
            qty,
          });
        }
      }
    }

    return Array.from(map.values());
  }
}
