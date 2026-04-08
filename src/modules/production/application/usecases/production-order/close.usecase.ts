import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from "src/modules/catalog/application/ports/product-recipe.repository";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/application/ports/stock-item.repository.port";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import { TransactionContext, UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";
import { ConsumeReservedMaterialsUseCase } from "./consume-reserved-materials.usecase";
import { PostProductionDocumentsUseCase } from "./post-production-documents.usecase";
import { ProductionOrderNotFoundApplicationError } from "../../errors/production-order-not-found.error";

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

  async execute(
    params: { productionId: string; postedBy?: string },
    tx?: TransactionContext,
  ): Promise<{ message: string }> {
    const run = async (ctx?: TransactionContext) => {
      const result = await this.orderRepo.getByIdWithItems(params.productionId, ctx);
      if (!result) {
        throw new NotFoundException(new ProductionOrderNotFoundApplicationError().message);
      }

      const { items, order } = result;
      try {
        order.assertCanClose();
      } catch (err) {
        if (err instanceof DomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }

      for (const item of items ?? []) {
        const finishedStockItem = await this.stockItemRepo.findById(item.finishedItemId, ctx);
        if (!finishedStockItem) {
          throw new NotFoundException("No se encontro el item de stock terminado");
        }

        const finishedRecipeItemId =
          finishedStockItem.type === 'PRODUCT' ? finishedStockItem.productId : finishedStockItem.variantId;
        if (!finishedRecipeItemId) {
          throw new NotFoundException("No se encontro la referencia del item terminado");
        }

        const recipes = await this.recipeRepo.listByFinishedItem(
          finishedStockItem.type,
          finishedRecipeItemId,
          ctx,
        );
        if (!recipes?.length) {
          throw new BadRequestException("Receta no encontrada");
        }

        const stockItemCache = new Map<string, string>();
        const consumption: RecipeConsumptionLine[] = [];

        for (const recipe of recipes) {
          const cached = stockItemCache.get(recipe.primaVariantId);
          let stockItemId = cached;

          if (!stockItemId) {
            const stockItem = await this.stockItemRepo.findByProductIdOrVariantId(recipe.primaVariantId, ctx);
            if (!stockItem?.stockItemId) {
              throw new NotFoundException("Stock item de materia prima no encontrado");
            }
            stockItemId = stockItem.stockItemId;
            stockItemCache.set(recipe.primaVariantId, stockItemId);
          }

          consumption.push({
            stockItemId,
            locationId: undefined,
            qty: recipe.quantity * item.quantity,
          });
        }

        try {
          await this.consumeReserved.execute(
            {
              warehouseId: order.fromWarehouseId,
              consumption,
              reserveMode: false,
            },
            ctx,
          );

          await this.postDocs.execute(
            { order, items, consumption, postedBy: params.postedBy },
            ctx,
          );
        } catch (err) {
          if (err instanceof BadRequestException) throw err;
          throw new InternalServerErrorException("Error al consumir stock reservado");
        }
      }

      await this.orderRepo.setStatus(
        {
          productionId: params.productionId,
          status: ProductionStatus.COMPLETED,
        },
        ctx,
      );

      return { message: "Orden de produccion completada" };
    };

    if (tx) return run(tx);
    return this.uow.runInTransaction((newTx) => run(newTx));
  }
}
