import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { UpdateProductionOrderInput } from "../../dto/production-order/input/update-production-order";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";

@Injectable()
export class UpdateProductionOrder {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
  ) {}

  async execute(input: UpdateProductionOrderInput, userId:string): Promise<{type:string,message:string}> {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.orderRepo.findById(input.productionId, tx);
      if (!current) {
        throw new NotFoundException(
          {
            type:'error',
            message:'Orden de produccion no encontrada'
          }
        );
      }
      if (current.status !== ProductionStatus.DRAFT) {
        throw new BadRequestException(
          {
            type:'error',
            message:'Solo se puede actualizar una orden en DRAFT'
          }
        );
      }

      const updated = await this.orderRepo.update(
        {
          ...input,
          updatedAt: new Date(),
          updatedBy: userId,
        },
        tx,
      );

      if (!updated) {
        throw new NotFoundException(
          {
            type:'error',
            message:'Orden de produccion no encontrada'
          }
        );
      }

      return {
        type:'success',
        message: '¡Documento actualizado con exito!'
      };
    });
  }
}
