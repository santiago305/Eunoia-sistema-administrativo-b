import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { UNIT_OF_WORK, UnitOfWork } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { BuildConsumptionFromRecipesUseCase } from "./build-consumption-from-recipes.usecase";
import { ConsumeReservedMaterialsUseCase } from "./consume-reserved-materials.usecase";

@Injectable()
export class CancelProductionOrder {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    private readonly buildConsumption: BuildConsumptionFromRecipesUseCase,
    private readonly consumeReserved: ConsumeReservedMaterialsUseCase,
  ) {}

  async execute(params: { productionId: string }, userId: string): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const result = await this.orderRepo.getByIdWithItems(params.productionId, tx);
      if (!result) {
        throw new NotFoundException({ type: "error", message: "Orden de produccion no encontrada" });
      }

      const { order, items } = result;

      if (order.status === ProductionStatus.COMPLETED) {
        throw new BadRequestException({ type: "error", message: "No se puede cancelar una orden COMPLETED" });
      }
      if (order.status === ProductionStatus.CANCELLED) {
        throw new BadRequestException({ type: "error", message: "Ya esta cancelada la orden" });
      }

      // liberar reserva de materia prima
      const consumption = await this.buildConsumption.execute(
        { productionId: params.productionId },
        tx,
      );

      await this.consumeReserved.execute(
        { warehouseId: order.fromWarehouseId, consumption, reserveMode: false },
        tx,
      );

      // eliminar items
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

      return { type: "success", message: "Orden cancelada" };
    });
  }
}
