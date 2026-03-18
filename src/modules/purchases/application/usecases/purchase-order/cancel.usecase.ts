import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { PurchaseOrderExpectedScheduler } from "src/modules/purchases/application/jobs/purchase-order-expected-scheduler";

export class CancelPurchaseOrderUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    private readonly scheduler: PurchaseOrderExpectedScheduler,
  ) {}

  async execute(poId: string): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.purchaseRepo.findById(poId, tx);
      if (!order) {
        throw new NotFoundException({ type: "error", message: "Orden no encontrada" });
      }

      if (order.status === PurchaseOrderStatus.RECEIVED) {
        throw new BadRequestException({ type: "error", message: "No se puede cancelar una orden RECEIVED" });
      }

      if (order.status === PurchaseOrderStatus.CANCELLED) {
        throw new BadRequestException({ type: "error", message: "Ya esta cancelada la orden" });
      }

      const updated = await this.purchaseRepo.update(
        { poId: order.poId, status: PurchaseOrderStatus.CANCELLED },
        tx,
      );

      if (!updated) {
        throw new BadRequestException({ type: "error", message: "No se pudo actualizar estado" });
      }

      this.scheduler.cancel(order.poId);

      return { type: "success", message: "Orden cancelada" };
    });
  }
}
