import { BadRequestException, Inject, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { errorResponse, successResponse } from "src/shared/response-standard/response";
import { USER_REPOSITORY, UserRepository } from "src/modules/users/application/ports/user.repository";
import { Email } from "src/modules/users/domain";
import { CloseProductionOrder } from "./close.usecase";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";

export class RunProductionTimeUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    private readonly closeOrder: CloseProductionOrder,

  ) {}

  async execute(productionId: string, tx?: TransactionContext) {
    const run = async (ctx?: TransactionContext) => {
      const order = await this.orderRepo.findById(productionId, ctx);
      if (!order) {
        throw new NotFoundException({ type: "error", message: "Orden de produccion no encontrada" });
      }
      if (order.status !== ProductionStatus.IN_PROGRESS) {
        throw new BadRequestException({ type: "error", message: "La orden no esta en IN_PROGRESS" });
      }

      const now = this.clock.now();
      if (order.manufactureDate.getTime() > now.getTime()) {
        throw new BadRequestException({ type: "error", message: "Aun no se cumple el tiempo de produccion" });
      }

      const adminUser = await this.userRepo.findByEmail(new Email("admin@gmail.com"));
      if (!adminUser) {
        throw new NotFoundException({ type: "error", message: "Usuario admin@gmail.com no encontrado" });
      }
      try {
        const data = {
          productionId: order.productionId,
          postedBy: adminUser.id,
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
