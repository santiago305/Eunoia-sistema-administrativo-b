import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { AddProductionOrderItemInput } from "../../dto/production-order/input/add-production-order-item";
import { ProductionOrderItemOutput } from "../../dto/production-order/output/production-order-item-out";
import { ProductionOrderItem } from "src/modules/production/domain/entity/production-order-item";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from "src/modules/catalog/domain/ports/product-recipe.repository";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { ConsumeReservedMaterialsUseCase } from "./consume-reserved-materials.usecase";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";

@Injectable()
export class AddProductionOrderItem {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(PRODUCT_RECIPE_REPOSITORY)
    private readonly recipeRepo: ProductRecipeRepository,
    private readonly reserveMaterials: ConsumeReservedMaterialsUseCase,
  ) {}

  async execute(input: AddProductionOrderItemInput): Promise<ProductionOrderItemOutput> {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.orderRepo.findById(input.productionId, tx);

      if (!order) {
        throw new NotFoundException({ type: "error", message: "Orden de produccion no encontrada" });
      }
      if (order.status !== ProductionStatus.DRAFT) {
        throw new BadRequestException({ type: "error", message: "Solo se puede agregar items a una orden en DRAFT" });
      }
      if (input.quantity === undefined || input.quantity === null) {
        throw new BadRequestException({ type: "error", message: "Cantidad no puede ser null" });
      }

      const recipes = await this.recipeRepo.listByVariantId(input.finishedVariantId, tx);

      const consumption: RecipeConsumptionLine[] = recipes.map((r) => ({
        variantId: r.primaVariantId,
        locationId: input.fromLocationId ?? undefined,
        qty: r.quantity * input.quantity,
      }));

      await this.reserveMaterials.execute(
        {
          warehouseId: order.fromWarehouseId,
          consumption,
          reserveMode: true,
        },
        tx,
      );

      const item = new ProductionOrderItem(
        undefined,
        input.productionId,
        input.finishedVariantId,
        input.fromLocationId,
        input.toLocationId,
        input.quantity,
        input.unitCost,
      );

      const saved = await this.orderRepo.addItem(item, tx);

      return {
        id: saved.productionItemId!,
        productionId: saved.productionId,
        finishedVariantId: saved.finishedVariantId,
        fromLocationId: saved.fromLocationId,
        toLocationId: saved.toLocationId,
        quantity: saved.quantity,
        unitCost: saved.unitCost,
      };
    });
  }
}
