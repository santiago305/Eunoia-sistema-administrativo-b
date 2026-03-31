import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { UpdateProductionOrderInput } from "../../dto/production-order/input/update-production-order";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { AddProductionOrderItem } from "./add-item.usecase";
import { errorResponse } from "src/shared/response-standard/response";

@Injectable()
export class UpdateProductionOrder {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    private readonly ItemProduction: AddProductionOrderItem
  ) {}

  async execute(input: UpdateProductionOrderInput, userId:string): Promise<{type:string,message:string
    productionId?:string
  }> {
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
        throw new NotFoundException(errorResponse('Error al actualizar compra'));
      }

      try {
        await this.orderRepo.removeItems(input.productionId, tx);
      } catch {
        throw new InternalServerErrorException(errorResponse('Error al ingresar items'));
      }

      try {
        for (const item of input.items ?? []) {
          await this.ItemProduction.execute(
            {
              productionId: input.productionId,
              finishedItemId: item.finishedItemId,
              fromLocationId: item.fromLocationId,
              toLocationId: item.toLocationId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              type: item.type
            },
            tx,
          );
        }
      } catch {
        throw new InternalServerErrorException(errorResponse('Error al ingresar items'));
      }

      return {
        type:'success',
        message: '¡Documento actualizado con exito!',
        productionId:input.productionId
      };
    });
  }
}
