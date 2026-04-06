import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { CLOCK, ClockPort } from "src/modules/inventory/application/ports/clock.port";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import { TransactionContext, UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse } from "src/shared/response-standard/response";
import { ProductionOrderNotFoundApplicationError } from "../../errors/production-order-not-found.error";
import { CloseProductionOrder } from "./close.usecase";

@Injectable()
export class RunProductionTimeUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    private readonly closeOrder: CloseProductionOrder,
  ) {}

  async execute(productionId: string, tx?: TransactionContext) {
    const run = async (ctx?: TransactionContext) => {
      const order = await this.orderRepo.findById(productionId, ctx);
      if (!order) {
        throw new NotFoundException(new ProductionOrderNotFoundApplicationError().message);
      }

      try {
        order.assertCanAutoClose(this.clock.now());
      } catch (err) {
        if (err instanceof DomainError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }

      try {
        await this.closeOrder.execute(
          {
            productionId: order.productionId,
            postedBy: order.createdBy,
          },
          ctx,
        );
      } catch {
        await this.orderRepo.setStatus(
          {
            productionId: order.productionId,
            status: ProductionStatus.PARTIAL,
          },
          ctx,
        );
        throw new InternalServerErrorException("Error al procesar produccion");
      }

      return successResponse("Produccion cerrada automaticamente");
    };

    if (tx) return run(tx);
    return this.uow.runInTransaction((newTx) => run(newTx));
  }
}
