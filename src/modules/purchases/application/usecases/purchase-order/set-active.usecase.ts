import { Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { SetPurchaseOrderActiveInput } from "../../dtos/purchase-order/input/set-active.input";

export class SetPurchaseOrderActiveUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
  ) {}

  async execute(input: SetPurchaseOrderActiveInput): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      await this.purchaseRepo.setActive(input.poId, input.isActive, tx);
      return {
        type: "success",
        message: input.isActive ? "Orden de compra habilitada" : "Orden de compra deshabilitada",
      };
    });
  }
}
