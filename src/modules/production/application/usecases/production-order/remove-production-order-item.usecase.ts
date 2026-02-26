import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { RemoveProductionOrderItemInput } from "../../dto/production-order/input/remove-production-order-item";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from "src/modules/catalog/domain/ports/product-recipe.repository";
import { ConsumeReservedMaterialsUseCase } from "./consume-reserved-materials.usecase";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";

@Injectable()
export class RemoveProductionOrderItem {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(PRODUCT_RECIPE_REPOSITORY)
    private readonly recipeRepo: ProductRecipeRepository,
    private readonly reserveMaterials: ConsumeReservedMaterialsUseCase,
  ) {}

  async execute(input: RemoveProductionOrderItemInput): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.orderRepo.findById(input.productionId, tx);
      if (!order) {
        throw new NotFoundException({ type: "error", message: "Orden de produccion no encontrada" });
      }
      if (order.status !== ProductionStatus.DRAFT) {
        throw new BadRequestException({ type: "error", message: "Solo se puede eliminar items en DRAFT" });
      }

      const { items } = (await this.orderRepo.getByIdWithItems(input.productionId, tx))!;
      const item = items.find((i) => i.productionItemId === input.itemId);
      if (!item) {
        throw new NotFoundException({ type: "error", message: "Item no encontrado" });
      }

      const recipes = await this.recipeRepo.listByVariantId(item.finishedVariantId, tx);
      const consumption: RecipeConsumptionLine[] = recipes.map((r) => ({
        variantId: r.primaVariantId,
        locationId: item.fromLocationId ?? undefined,
        qty: r.quantity * item.quantity,
      }));

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
