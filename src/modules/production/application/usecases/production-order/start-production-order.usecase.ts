import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";

@Injectable()
export class StartProductionOrder {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
  ) {}

  async execute(params: { productionId: string }): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const result = await this.orderRepo.getByIdWithItems(params.productionId, tx);
      
      const { items, order } = result;
      
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

      return { type: "success", message: "Orden iniciada" };
    });
  }
}
