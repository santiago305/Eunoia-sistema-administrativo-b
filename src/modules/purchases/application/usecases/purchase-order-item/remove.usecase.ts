import { Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { RemovePurchaseOrderItemInput } from "../../dtos/purchase-order-item/input/remove.input";
import { PurchaseOrderItemNotFoundApplicationError } from "../../errors/purchase-order-item-not-found.error";

export class RemovePurchaseOrderItemUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly itemRepo: PurchaseOrderItemRepository,
  ) {}

  async execute(input: RemovePurchaseOrderItemInput): Promise<{ message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      const removed = await this.itemRepo.remove(input.poItemId, tx);
      if (!removed) {
        const error = new PurchaseOrderItemNotFoundApplicationError();
        throw new NotFoundException(error.message);
      }
      return { message: "Item eliminado con exito" };
    });
  }
}
