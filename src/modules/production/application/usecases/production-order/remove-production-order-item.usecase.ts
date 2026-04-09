import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { RemoveProductionOrderItemInput } from "../../dto/production-order/input/remove-production-order-item";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { ConsumeReservedMaterialsUseCase } from "./consume-reserved-materials.usecase";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";
import { ProductionOrderItemNotFoundApplicationError } from "../../errors/production-order-item-not-found.error";
import { ProductionOrderNotFoundApplicationError } from "../../errors/production-order-not-found.error";
import { ProductionItemResolverService } from "../../services/production-item-resolver.service";

@Injectable()
export class RemoveProductionOrderItem {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    private readonly itemResolver: ProductionItemResolverService,
    private readonly reserveMaterials: ConsumeReservedMaterialsUseCase,
  ) {}

  async execute(input: RemoveProductionOrderItemInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.orderRepo.findById(input.productionId, tx);
      if (!order) {
        throw new NotFoundException(new ProductionOrderNotFoundApplicationError().message);
      }

      try {
        order.assertCanRemoveItem();
      } catch (err) {
        if (err instanceof DomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }

      const withItems = await this.orderRepo.getByIdWithItems(input.productionId, tx);
      const item = withItems?.items.find((row) => row.productionItemId === input.itemId);
      if (!item) {
        throw new NotFoundException(new ProductionOrderItemNotFoundApplicationError().message);
      }

      const recipeConsumption = await this.itemResolver.resolveRecipeConsumption(
        item.finishedItemId,
        item.quantity,
        tx,
      );
      const consumption: RecipeConsumptionLine[] = recipeConsumption.map((row) => ({
        stockItemId: row.stockItemId,
        locationId: item.fromLocationId ?? undefined,
        qty: row.quantity,
      }));

      await this.reserveMaterials.execute(
        { warehouseId: order.fromWarehouseId, consumption, reserveMode: false },
        tx,
      );

      const removed = await this.orderRepo.removeItem(input.productionId, input.itemId, tx);
      if (!removed) {
        throw new NotFoundException(new ProductionOrderItemNotFoundApplicationError().message);
      }

      return { message: "Item eliminado con exito" };
    });
  }
}
