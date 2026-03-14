import { Inject, Injectable, InternalServerErrorException, OnApplicationBootstrap } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { ProductionStatus } from "src/modules/production/domain/value-objects/production-status";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { ProductionOrderExpectedScheduler } from "./production-order-expected-scheduler";
import { RunProductionTimeUsecase } from "../usecases/production-order/run-production-time.usecase";

@Injectable()
export class ProductionOrderExpectedBootstrap implements OnApplicationBootstrap {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    private readonly scheduler: ProductionOrderExpectedScheduler,
    private readonly runExpected: RunProductionTimeUsecase,
  ) {}

  async onApplicationBootstrap() {
    const orders = await this.orderRepo.listAllByStatus(ProductionStatus.IN_PROGRESS);
    const now = this.clock.now();

    for (const order of orders) {
      if (!order.manufactureDate) continue;
      if (order.manufactureDate.getTime() <= now.getTime()) {
        await this.runExpected.execute(order.productionId).catch((err) => {
          throw new InternalServerErrorException({
            type: "error",
            message: err,
          });
        });
      } else {
        this.scheduler.schedule(order.productionId, order.manufactureDate);
      }
    }
  }
}
