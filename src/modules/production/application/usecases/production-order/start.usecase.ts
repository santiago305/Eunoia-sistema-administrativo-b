import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";
import { errorResponse } from "src/shared/response-standard/response";
import { ConsumeReservedMaterialsUseCase } from "./consume-reserved-materials.usecase";
import { ProductionOrderExpectedScheduler } from "../../jobs/production-order-expected-scheduler";
import { PRODUCT_RECIPE_REPOSITORY, ProductRecipeRepository } from "src/modules/catalog/application/ports/product-recipe.repository";
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from "src/modules/inventory/application/ports/stock-item.repository.port";

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

  async execute(params: { productionId: string }): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const result = await this.orderRepo.getByIdWithItems(params.productionId, tx);
      
      const { items, order } = result;
      console.log('[StartProductionOrder] loaded', {
        productionId: params.productionId,
        orderStatus: order?.status,
        fromWarehouseId: order?.fromWarehouseId,
        itemsCount: items?.length ?? 0,
      });
      
      if (!order) {
        throw new NotFoundException(
        {
          type:'error',
          message:'Orden de produccion no encontrada'
        });
      }
      if (order.status !== ProductionStatus.DRAFT) {
        throw new BadRequestException(
        {
          type: 'error',
          message: 'Solo se puede iniciar una orden en DRAFT'
        });
      }
      if(items.length < 1){
        throw new NotFoundException(
        {
          type:'error',
          message:'¡No hay ningun item registrado!'
        });
      }

      await this.orderRepo.setStatus(
        {
          productionId: params.productionId,
          status: ProductionStatus.IN_PROGRESS,
        },
        tx,
      );

      for (const item of items ?? []) {
        console.log('[StartProductionOrder] item', {
          productionItemId: item.productionItemId,
          finishedItemId: item.finishedItemId,
          quantity: item.quantity,
          fromLocationId: item.fromLocationId,
          toLocationId: item.toLocationId,
        });
        const recipes = await this.recipeRepo.listByItemId(item.finishedItemId, tx);
        if (!recipes || recipes.length === 0) {
          throw new BadRequestException({ type: "error", message: "Receta no encontrada" });
        }
        console.log('[StartProductionOrder] recipes', {
          finishedItemId: item.finishedItemId,
          count: recipes.length,
          lines: recipes.map((r) => ({
            finishedVariantId: r.finishedVariantId,
            primaVariantId: r.primaVariantId,
            qty: r.quantity,
            waste: r.waste,
          })),
        });

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
          console.log('[StartProductionOrder] consumption-line', {
            primaVariantId: r.primaVariantId,
            stockItemId,
            recipeQty: r.quantity,
            itemQty: item.quantity,
            totalQty: r.quantity * item.quantity,
          });
          consumption.push({
            stockItemId,
            locationId: undefined,
            qty: r.quantity * item.quantity,
          });
        }
        console.log('[StartProductionOrder] reserveMaterials input', {
          warehouseId: order.fromWarehouseId,
          consumption,
        });
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
          throw new InternalServerErrorException(errorResponse('Error al apartar stockItem'));
        }
      }

      this.scheduler.schedule(order.productionId, order.manufactureDate);

      return { type: "success", message: "Orden iniciada" };
    });
  }
}
