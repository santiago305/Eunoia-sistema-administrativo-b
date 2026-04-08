import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/application/ports/stock-item.repository.port";
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from "src/modules/catalog/application/ports/product-recipe.repository";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";
import { ConsumeReservedMaterialsUseCase } from "./consume-reserved-materials.usecase";
import { ProductionOrderExpectedScheduler } from "../../jobs/production-order-expected-scheduler";
import { ProductionOrderNotFoundApplicationError } from "../../errors/production-order-not-found.error";

@Injectable()
export class StartProductionOrder {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(PRODUCT_RECIPE_REPOSITORY)
    private readonly recipeRepo: ProductRecipeRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
    private readonly reserveMaterials: ConsumeReservedMaterialsUseCase,
    private readonly scheduler: ProductionOrderExpectedScheduler,
  ) {}

  async execute(params: { productionId: string }): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const result = await this.orderRepo.getByIdWithItems(params.productionId, tx);
      if (!result) {
        throw new NotFoundException(new ProductionOrderNotFoundApplicationError().message);
      }

      const { items, order } = result;
      try {
        order.assertCanStart(items?.length ?? 0);
      } catch (err) {
        if (err instanceof DomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }

      await this.orderRepo.setStatus(
        {
          productionId: params.productionId,
          status: ProductionStatus.IN_PROGRESS,
        },
        tx,
      );

      for (const item of items ?? []) {
        const finishedStockItem = await this.stockItemRepo.findById(item.finishedItemId, tx);
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
          tx,
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
            const stockItem = await this.stockItemRepo.findByProductIdOrVariantId(recipe.primaVariantId, tx);
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
          await this.reserveMaterials.execute(
            {
              warehouseId: order.fromWarehouseId,
              consumption,
              reserveMode: true,
            },
            tx,
          );
        } catch (err) {
          if (err instanceof BadRequestException) throw err;
          throw new InternalServerErrorException("Error al apartar stock item");
        }
      }

      this.scheduler.schedule(order.productionId, order.manufactureDate);
      return { message: "Orden iniciada con exito" };
    });
  }
}
