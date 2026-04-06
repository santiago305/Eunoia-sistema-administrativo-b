import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { ProductionOrderNotFoundApplicationError } from "../../errors/production-order-not-found.error";

@Injectable()
export class CancelProductionOrder {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
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
