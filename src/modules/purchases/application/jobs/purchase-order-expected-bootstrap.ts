import { Inject, Injectable, InternalServerErrorException, OnApplicationBootstrap } from "@nestjs/common";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { PurchaseOrderExpectedScheduler } from "./purchase-order-expected-scheduler";
import { RunExpectedAtUsecase } from "../usecases/purchase-order/run-expected-at.usecase";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";

@Injectable()
export class PurchaseOrderExpectedBootstrap implements OnApplicationBootstrap {
  constructor(
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    private readonly scheduler: PurchaseOrderExpectedScheduler,
    private readonly runExpected: RunExpectedAtUsecase,
  ) {}

  async onApplicationBootstrap() {
    const orders = await this.purchaseRepo.listAllByStatus(PurchaseOrderStatus.SENT);
    const now = this.clock.now();

    for (const order of orders) {
      if (!order.expectedAt) continue;
      if (order.expectedAt.getTime() <= now.getTime()) {
        await this.runExpected.execute(order.poId).catch((err) => {
        throw new InternalServerErrorException({
          type:'error',
          message:err
        });
      });
      } else {
        this.scheduler.schedule(order.poId, order.expectedAt);
      }
    }
  }
}

