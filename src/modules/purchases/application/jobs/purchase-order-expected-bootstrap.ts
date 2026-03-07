import { Inject, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { PurchaseOrderExpectedScheduler } from "./purchase-order-expected-scheduler";
import { RunExpectedAtUsecase } from "../usecases/purchase-order/run-expected-at.usecase";

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
    console.log(
      "[PurchaseOrderExpectedBootstrap] start",
      JSON.stringify({ total: orders.length, status: PurchaseOrderStatus.SENT }),
    );

    const now = this.clock.now();

    for (const order of orders) {
      if (!order.expectedAt) continue;

      const expectedAtMs = order.expectedAt.getTime();
      const nowMs = now.getTime();
      console.log(
        "[PurchaseOrderExpectedBootstrap] check",
        JSON.stringify({
          poId: order.poId,
          expectedAt: new Date(expectedAtMs).toISOString(),
          now: new Date(nowMs).toISOString(),
          diffMs: expectedAtMs - nowMs,
        }),
      );

      if (order.expectedAt.getTime() <= now.getTime()) {
        await this.runExpected.execute(order.poId).catch(() => undefined);
      } else {
        this.scheduler.schedule(order.poId, order.expectedAt);
      }
    }
  }
}
