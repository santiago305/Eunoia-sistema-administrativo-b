import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";
import { ConsumeReservedMaterialsUseCase } from "./consume-reserved-materials.usecase";
import { ProductionOrderExpectedScheduler } from "../../jobs/production-order-expected-scheduler";
import { ProductionOrderNotFoundApplicationError } from "../../errors/production-order-not-found.error";
import { BuildConsumptionFromRecipesUseCase } from "./build-consumption-from-recipes.usecase";
import { ReserveProductCatalogMaterials } from "src/modules/product-catalog/application/usecases/reserve-materials.usecase";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";

@Injectable()
export class StartProductionOrder {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    private readonly reserveMaterials: ConsumeReservedMaterialsUseCase,
    private readonly buildConsumption: BuildConsumptionFromRecipesUseCase,
    private readonly reserveSkuMaterials: ReserveProductCatalogMaterials,
    private readonly scheduler: ProductionOrderExpectedScheduler,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
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

      const now = this.clock.now();
      const baseDate = order.createdAt ?? now;
      const originalWaitMs = Math.max(0, order.manufactureDate.getTime() - baseDate.getTime());
      const recalculatedManufactureDate = new Date(now.getTime() + originalWaitMs);

      await this.orderRepo.update(
        {
          productionId: params.productionId,
          manufactureDate: recalculatedManufactureDate,
          updatedAt: now,
        },
        tx,
      );

      await this.orderRepo.setStatus(
        {
          productionId: params.productionId,
          status: ProductionStatus.IN_PROGRESS,
          updatedAt: now,
        },
        tx,
      );

      const consumption = await this.buildConsumption.execute({ productionId: params.productionId }, tx);
      const legacyConsumption: RecipeConsumptionLine[] = [];
      const skuConsumption = consumption.filter((line) => line.mode === "sku");
      for (const line of consumption) {
        if (line.mode !== "sku") legacyConsumption.push(line);
      }

      if (legacyConsumption.length) {
        try {
          await this.reserveMaterials.execute(
            {
              warehouseId: order.fromWarehouseId,
              consumption: legacyConsumption,
              reserveMode: true,
            },
            tx,
          );
        } catch (err) {
          if (err instanceof BadRequestException) throw err;
          throw new InternalServerErrorException("Error al apartar stock item");
        }
      }

      if (skuConsumption.length) {
        try {
          await this.reserveSkuMaterials.execute({
            warehouseId: order.fromWarehouseId,
            consumption: skuConsumption.map((line) => ({
              stockItemId: line.stockItemId,
              locationId: line.locationId,
              qty: line.qty,
            })),
            reserveMode: true,
          });
        } catch (err) {
          if (err instanceof BadRequestException) throw err;
          throw new InternalServerErrorException("Error al apartar stock item SKU");
        }
      }

      this.scheduler.schedule(order.productionId, recalculatedManufactureDate);
      return { message: "Orden iniciada con exito" };
    });
  }
}
