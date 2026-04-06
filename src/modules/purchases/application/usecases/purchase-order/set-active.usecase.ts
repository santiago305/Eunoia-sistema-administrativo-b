import { Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { SetPurchaseOrderActiveInput } from "../../dtos/purchase-order/input/set-active.input";
import { PurchaseOrderNotFoundApplicationError } from "../../errors/purchase-order-not-found.error";

export class SetPurchaseOrderActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
  ) {}

  async execute(input: SetPurchaseOrderActiveInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const order = await this.purchaseRepo.findById(input.poId, tx);
      if (!order) {
        throw new NotFoundException(new PurchaseOrderNotFoundApplicationError().message);
      }

      await this.purchaseRepo.setActive(input.poId, input.isActive, tx);
      return {
        message: input.isActive ? "Orden de compra habilitada" : "Orden de compra deshabilitada",
      };
    });
  }
}
