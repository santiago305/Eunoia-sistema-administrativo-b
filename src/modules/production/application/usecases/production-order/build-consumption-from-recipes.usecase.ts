import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { ProductionOrderNotFoundApplicationError } from "../../errors/production-order-not-found.error";
import { ProductionItemResolverService } from "../../services/production-item-resolver.service";

export interface RecipeConsumptionLine {
  stockItemId: string;
  skuId?: string;
  mode?: "legacy" | "sku";
  locationId?: string;
  qty: number;
  wasteQty?: number;
}

@Injectable()
export class BuildConsumptionFromRecipesUseCase {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    private readonly itemResolver: ProductionItemResolverService,
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
    for (const item of result.items) {
      const materials = await this.itemResolver.resolveRecipeConsumption(item.finishedItemId, item.quantity, tx);

      for (const material of materials) {
        const locationId = item.fromLocationId ?? undefined;
        const stockItemId = material.stockItemId;
        const key = `${stockItemId}::${locationId ?? "null"}`;

        const current = map.get(key);
        if (current) {
          current.qty += material.quantity;
        } else {
          map.set(key, {
            stockItemId,
            skuId: material.skuId,
            mode: material.mode,
            locationId,
            qty: material.quantity,
          });
        }
      }
    }

    return Array.from(map.values());
  }
}
