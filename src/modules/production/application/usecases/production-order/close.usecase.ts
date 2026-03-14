import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { UNIT_OF_WORK, UnitOfWork, TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { ConsumeReservedMaterialsUseCase } from "./consume-reserved-materials.usecase";
import { PostProductionDocumentsUseCase } from "./post-production-documents.usecase";
import { errorResponse, successResponse } from "src/shared/response-standard/response";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from "src/modules/catalog/domain/ports/product-recipe.repository";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/domain/ports/stock-item/stock-item.repository.port";

@Injectable()
export class CloseProductionOrder {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(PRODUCT_RECIPE_REPOSITORY)
    private readonly recipeRepo: ProductRecipeRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    private readonly consumeReserved: ConsumeReservedMaterialsUseCase,
    private readonly postDocs: PostProductionDocumentsUseCase,
  ) {}

  async execute(params: {
    productionId: string;
    postedBy?: string;
  }, tx?: TransactionContext): Promise<{ type: string; message: string }> {
    const run = async (ctx?: TransactionContext) => {
      const result = await this.orderRepo.getByIdWithItems(params.productionId, ctx);
      if (!result) {
        throw new NotFoundException(errorResponse('Orden de produccion no encontrada'));
      }

      const { items, order } = result;

      if (order.status !== ProductionStatus.IN_PROGRESS) {
        throw new BadRequestException(errorResponse('Solo se puede cerrar una orden en proceso'));
      }

      for (const item of items ?? []) {
        const recipes = await this.recipeRepo.listByItemId(item.finishedItemId, tx);
        if (!recipes || recipes.length === 0) {
          throw new BadRequestException({ type: "error", message: "Receta no encontrada" });
        }

        const stockItemCache = new Map<string, string>();
        const consumption: RecipeConsumptionLine[] = [];
        for (const r of recipes) {
          const cached = stockItemCache.get(r.primaVariantId);
          let stockItemId = cached;
          if (!stockItemId) {
            const stockItem = await this.stockItemRepo.findByProductIdOrVariantId(r.primaVariantId, tx);
            if (!stockItem?.stockItemId) {
              throw new NotFoundException({ type: "error", message: "Stock item de materia prima no encontrado" });
            }
            stockItemId = stockItem.stockItemId;
            stockItemCache.set(r.primaVariantId, stockItemId);
          }
          consumption.push({
            stockItemId,
            locationId: undefined,
            qty: r.quantity * item.quantity,
          });
        }
        try {
          await this.consumeReserved.execute(
            {
              warehouseId: order.fromWarehouseId,
              consumption,
              reserveMode: false,
            },
            tx,
          );
          await this.postDocs.execute(
            { order, items, consumption, postedBy: params.postedBy },
            ctx,
          );
        } catch (err) {
          if (err instanceof BadRequestException) throw err;
          throw new InternalServerErrorException(errorResponse('Error al apartar stockItem'));
        }
      }

      await this.orderRepo.setStatus(
        {
          productionId: params.productionId,
          status: ProductionStatus.COMPLETED,
        },
        ctx,
      );

      return successResponse('¡Orden de Producción Completada!');
    };

    if (tx) return run(tx);
    return this.uow.runInTransaction((newTx) => run(newTx));
  }
}
