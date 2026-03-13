import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { AddProductionOrderItemInput } from "../../dto/production-order/input/add-production-order-item";
import { ProductionOrderItemOutput } from "../../dto/production-order/output/production-order-item-out";
import { ProductionOrderItem } from "src/modules/production/domain/entity/production-order-item";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from "src/modules/catalog/domain/ports/product-recipe.repository";
import { TransactionContext, UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { ConsumeReservedMaterialsUseCase } from "./consume-reserved-materials.usecase";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/domain/ports/stock-item/stock-item.repository.port";
import { errorResponse } from "src/shared/response-standard/response";


@Injectable()
export class AddProductionOrderItem {
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

  async execute(
    input: AddProductionOrderItemInput,
    tx?: TransactionContext,
  ): Promise<ProductionOrderItemOutput> {
    const work = async (ctx: TransactionContext) => {
      const order = await this.orderRepo.findById(input.productionId, ctx);

      if (!order) {
        throw new NotFoundException({ type: "error", message: "Orden de produccion no encontrada" });
      }
      if (order.status !== ProductionStatus.DRAFT) {
        throw new BadRequestException({ type: "error", message: "Solo se puede agregar items a una orden en DRAFT" });
      }
      if (input.quantity === undefined || input.quantity === null || input.quantity === 0) {
        throw new BadRequestException(errorResponse('Cantidad no validad'));
      }

      const finishedItem = await this.stockItemRepo.findByProductIdOrVariantId(input.finishedItemId, ctx);
      if (!finishedItem) {
        throw new NotFoundException({ type: "error", message: "StockItem terminado no encontrado" });
      }

      const recipes = await this.recipeRepo.listByItemId(input.finishedItemId, ctx);
      if (!recipes || recipes.length === 0) {
        throw new BadRequestException({ type: "error", message: "Receta no encontrada" });
      }

      const stockItemCache = new Map<string, string>();
      const consumption: RecipeConsumptionLine[] = [];
      for (const r of recipes) {
        const cached = stockItemCache.get(r.primaVariantId);
        let stockItemId = cached;
        if (!stockItemId) {
          const stockItem = await this.stockItemRepo.findByProductIdOrVariantId(r.primaVariantId, ctx);
          if (!stockItem?.stockItemId) {
            throw new NotFoundException({ type: "error", message: "Stock item de materia prima no encontrado" });
          }
          stockItemId = stockItem.stockItemId;
          stockItemCache.set(r.primaVariantId, stockItemId);
        }
        consumption.push({
          stockItemId,
          locationId: input.fromLocationId ?? undefined,
          qty: r.quantity * input.quantity,
        });
      }
      try {
        await this.reserveMaterials.execute(
          {
            warehouseId: order.fromWarehouseId,
            consumption,
            reserveMode: true,
          },
          ctx,
        );
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        throw new InternalServerErrorException(errorResponse('Error al apartar stockItem'));
      }

      const item = new ProductionOrderItem(
        undefined,
        input.productionId,
        input.finishedItemId,
        input.fromLocationId,
        input.toLocationId,
        input.quantity,
        input.unitCost,
        input.type
      );

      const saved = await this.orderRepo.addItem(item, ctx);

      return {
        id: saved.productionItemId!,
        productionId: saved.productionId,
        finishedItemId: saved.finishedItemId,
        fromLocationId: saved.fromLocationId,
        toLocationId: saved.toLocationId,
        quantity: saved.quantity,
        unitCost: saved.unitCost,
      };
    };

    if (tx) {
      return work(tx);
    }

    return this.uow.runInTransaction(work);
  }
}
