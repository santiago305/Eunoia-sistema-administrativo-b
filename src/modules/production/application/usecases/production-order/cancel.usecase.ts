import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { BuildConsumptionFromRecipesUseCase } from "./build-consumption-from-recipes.usecase";
import { ConsumeReservedMaterialsUseCase } from "./consume-reserved-materials.usecase";
import { errorResponse } from "src/shared/response-standard/response";

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

      try {
        order.assertCanCancel();
      } catch (err) {
        if (err instanceof DomainError) {
          throw new BadRequestException(errorResponse(err.message));
        }
        throw err;
      }

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
