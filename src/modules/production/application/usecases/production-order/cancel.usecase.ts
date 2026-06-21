import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { ProductionOrderNotFoundApplicationError } from "../../errors/production-order-not-found.error";
import { BuildConsumptionFromRecipesUseCase, RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";
import { ConsumeReservedMaterialsUseCase } from "./consume-reserved-materials.usecase";
import { ReserveProductCatalogMaterials } from "src/modules/product-catalog/application/usecases/reserve-materials.usecase";

@Injectable()
export class CancelProductionOrder {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    private readonly buildConsumption: BuildConsumptionFromRecipesUseCase,
    private readonly reserveMaterials: ConsumeReservedMaterialsUseCase,
    private readonly reserveSkuMaterials: ReserveProductCatalogMaterials,
  ) {}

  async execute(params: { productionId: string }, userId: string): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const result = await this.orderRepo.getByIdWithItems(params.productionId, tx);
      if (!result) {
        throw new NotFoundException(new ProductionOrderNotFoundApplicationError().message);
      }

      const { order, items } = result;
      try {
        order.assertCanCancel();
      } catch (err) {
        if (err instanceof DomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }

      if (order.status === ProductionStatus.IN_PROGRESS || order.status === ProductionStatus.PARTIAL) {
        const consumption = await this.buildConsumption.execute({ productionId: params.productionId }, tx);
        const legacyConsumption: RecipeConsumptionLine[] = [];
        const skuConsumption = consumption.filter((line) => line.mode === "sku");
        for (const line of consumption) {
          if (line.mode !== "sku") legacyConsumption.push(line);
        }

        if (legacyConsumption.length) {
          await this.reserveMaterials.execute(
            {
              warehouseId: order.fromWarehouseId,
              consumption: legacyConsumption,
              reserveMode: false,
            },
            tx,
          );
        }

        if (skuConsumption.length) {
          await this.reserveSkuMaterials.execute({
            warehouseId: order.fromWarehouseId,
            consumption: skuConsumption.map((line) => ({
              stockItemId: line.stockItemId,
              locationId: line.locationId,
              qty: line.qty,
            })),
            reserveMode: false,
          });
        }
      }

      for (const item of items) {
        await this.orderRepo.removeItem(order.productionId, item.productionItemId, tx);
      }

      await this.orderRepo.setStatus(
        {
          productionId: params.productionId,
          status: ProductionStatus.CANCELLED,
          updatedAt: new Date(),
          updatedBy: userId,
        },
        tx,
      );

      return { message: "Orden cancelada con exito" };
    });
  }
}
