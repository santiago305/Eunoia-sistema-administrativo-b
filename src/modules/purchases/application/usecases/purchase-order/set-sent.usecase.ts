import { PurchaseOrderExpectedScheduler } from "src/modules/purchases/application/jobs/purchase-order-expected-scheduler";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { successResponse } from "src/shared/response-standard/response";
import { PurchaseOrderNotFoundApplicationError } from "../../errors/purchase-order-not-found.error";
import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";

export class SetSentPurchaseOrderUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    private readonly scheduler: PurchaseOrderExpectedScheduler,
  ) {}

  async execute(poId: string): Promise<ReturnType<typeof successResponse>> {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.purchaseRepo.findById(poId, tx);
      if (!order) {
        throw new NotFoundException(new PurchaseOrderNotFoundApplicationError().message);
      }

      if (!order.expectedAt) {
        throw new BadRequestException("La orden no tiene expectedAt");
      }

      if (![PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.PARTIAL].includes(order.status)) {
        throw new BadRequestException("Estado invalido para pasar a SENT");
      }

      const updated = await this.purchaseRepo.update(
        { poId: order.poId, status: PurchaseOrderStatus.SENT },
        tx,
      );

      if (!updated) {
        throw new BadRequestException("No se pudo actualizar estado");
      }

      this.scheduler.schedule(updated.poId, updated.expectedAt!);

      return successResponse("Orden marcada como SENT y programada");
    });
  }
}
