import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { RemoveProductionOrderItemInput } from "../../dto/production-order/input/remove-production-order-item";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { ConsumeReservedMaterialsUseCase } from "./consume-reserved-materials.usecase";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from "src/modules/catalog/application/ports/product-recipe.repository";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/application/ports/stock-item.repository.port";
import { errorResponse } from "src/shared/response-standard/response";

@Injectable()
export class RemoveProductionOrderItem {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(PRODUCT_RECIPE_REPOSITORY)
    private readonly recipeRepo: ProductRecipeRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    private readonly reserveMaterials: ConsumeReservedMaterialsUseCase,
  ) {}

  async execute(input: RemoveProductionOrderItemInput): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.orderRepo.findById(input.productionId, tx);
      if (!order) {
        throw new NotFoundException({ type: "error", message: "Orden de produccion no encontrada" });
      }
      try {
        order.assertCanRemoveItem();
      } catch (err) {
        if (err instanceof DomainError) {
          throw new BadRequestException(errorResponse(err.message));
        }
        throw err;
      }

      const { items } = (await this.orderRepo.getByIdWithItems(input.productionId, tx))!;
      const item = items.find((i) => i.productionItemId === input.itemId);
      if (!item) {
        throw new NotFoundException({ type: "error", message: "Item no encontrado" });
      }

      const finishedItem = await this.stockItemRepo.findById(item.finishedItemId, tx);
      if (!finishedItem?.variantId) {
        throw new NotFoundException({ type: "error", message: "Stock item de producto terminado no encontrado" });
      }

      const recipes = await this.recipeRepo.listByVariantId(finishedItem.variantId, tx);
      const stockItemCache = new Map<string, string>();
      const consumption: RecipeConsumptionLine[] = [];
      for (const r of recipes) {
        const cached = stockItemCache.get(r.primaVariantId);
        let stockItemId = cached;
        if (!stockItemId) {
          const stockItem = await this.stockItemRepo.findByVariantId(r.primaVariantId, tx);
          if (!stockItem?.stockItemId) {
            throw new NotFoundException({ type: "error", message: "Stock item de materia prima no encontrado" });
          }
          stockItemId = stockItem.stockItemId;
          stockItemCache.set(r.primaVariantId, stockItemId);
        }
        consumption.push({
          stockItemId,
          locationId: item.fromLocationId ?? undefined,
          qty: r.quantity * item.quantity,
        });
      }

      // Liberar reserva
      await this.reserveMaterials.execute(
        { warehouseId: order.fromWarehouseId, consumption, reserveMode: false },
        tx,
      );

      const removed = await this.orderRepo.removeItem(input.productionId, input.itemId, tx);
      if (!removed) {
        throw new NotFoundException({ type: "error", message: "Item no encontrado" });
      }

      return { type: "success", message: "Item eliminado" };
    });
  }
}
