import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status.vo";
import { DomainError } from "src/modules/production/domain/errors/domain.error";
import { errorResponse, successResponse } from "src/shared/response-standard/response";
import { CloseProductionOrder } from "./close.usecase";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { CLOCK, ClockPort } from "src/modules/inventory/application/ports/clock.port";

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
        throw new NotFoundException({ type: "error", message: "Orden de produccion no encontrada" });
      }
      try {
        order.assertCanAutoClose(this.clock.now());
      } catch (err) {
        if (err instanceof DomainError) {
          throw new BadRequestException(errorResponse(err.message));
        }
        throw err;
      }

      try {
        const data = {
          productionId: order.productionId,
          postedBy: order.createdBy,
        };
        await this.closeOrder.execute(data, ctx);
      } catch {
        await this.orderRepo.setStatus(
          {
            productionId: order.productionId,
            status: ProductionStatus.PARTIAL,
          },
          ctx,
        );
        throw new InternalServerErrorException(errorResponse("Error a procesar producción "));
      }
      return successResponse("ok si se cumple la funcion");
    };

    if (tx) return run(tx);
    return this.uow.runInTransaction((newTx) => run(newTx));
  }
}
