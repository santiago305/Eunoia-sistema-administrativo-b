import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { UpdateProductionOrderInput } from "../../dto/production-order/input/update-production-order";
import { ProductionOrderNotFoundApplicationError } from "../../errors/production-order-not-found.error";
import { ProductionOrderOutputMapper } from "../../mappers/production-order-output.mapper";
import { AddProductionOrderItem } from "./add-item.usecase";

@Injectable()
export class UpdateProductionOrder {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    private readonly itemProduction: AddProductionOrderItem,
  ) {}

  async execute(input: UpdateProductionOrderInput, userId: string) {
    return this.uow.runInTransaction(async (tx) => {
      const current = await this.orderRepo.findById(input.productionId, tx);
      if (!current) {
        throw new NotFoundException(new ProductionOrderNotFoundApplicationError().message);
      }

      try {
        current.assertCanUpdate();
      } catch (err) {
        if (err instanceof DomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
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
        throw new NotFoundException(new ProductionOrderNotFoundApplicationError().message);
      }

      try {
        await this.orderRepo.removeItems(input.productionId, tx);
      } catch {
        throw new InternalServerErrorException("Error al eliminar items");
      }

      try {
        for (const item of input.items ?? []) {
          await this.itemProduction.execute(
            {
              productionId: input.productionId,
              finishedItemId: item.finishedItemId,
              fromLocationId: item.fromLocationId,
              toLocationId: item.toLocationId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              type: item.type,
            },
            tx,
          );
        }
      } catch {
        throw new InternalServerErrorException("Error al ingresar items");
      }

      return {
        type: "success",
        message: "Orden de produccion actualizada con exito",
        order: ProductionOrderOutputMapper.toOrderOutput(updated),
      };
    });
  }
}
