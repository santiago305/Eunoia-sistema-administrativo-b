import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { BuildConsumptionFromRecipesUseCase } from "./build-consumption-from-recipes.usecase";
import { ConsumeReservedMaterialsUseCase } from "./consume-reserved-materials.usecase";
import { PostProductionDocumentsUseCase } from "./post-production-documents.usecase";

@Injectable()
export class CloseProductionOrder {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    private readonly buildConsumption: BuildConsumptionFromRecipesUseCase,
    private readonly consumeReserved: ConsumeReservedMaterialsUseCase,
    private readonly postDocs: PostProductionDocumentsUseCase,
  ) {}

  async execute(params: {
    productionId: string;
    postedBy?: string;
  }): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const result = await this.orderRepo.getByIdWithItems(params.productionId, tx);
      if (!result) {
        throw new NotFoundException(
          {
            type:'error',
            message:'Orden de produccion no encontrada'
          }
        );
      }

      const { items, order } = result;

      if (order.status !== ProductionStatus.IN_PROGRESS) {
        throw new BadRequestException(
          {
            type:'error',
            message:'Solo se puede cerrar una orden en IN_PROGRESS'
          }
        );
      }

      const consumption = await this.buildConsumption.execute(
        { productionId: params.productionId },
        tx,
      );

      await this.consumeReserved.execute(
        { warehouseId: order.fromWarehouseId, consumption, reserveMode: false },
        tx,
      );


      await this.postDocs.execute(
        { order, items, consumption, postedBy: params.postedBy },
        tx,
      );

      await this.orderRepo.setStatus(
        {
          productionId: params.productionId,
          status: ProductionStatus.COMPLETED,
        },
        tx,
      );

      return { type: "success", message: "Orden cerrada" };
    });
  }
}
