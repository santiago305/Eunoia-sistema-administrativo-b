import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { PostInventoryFromPurchaseUsecase } from "./Inventory-purchase.usecase";
import { CLOCK, ClockPort } from "src/shared/application/ports/clock.port";
import { PurchaseOrderId } from "src/modules/purchases/domain/value-objects/purchase-order-id.vo";
import { DomainError } from "src/modules/purchases/domain/errors/domain.error";
import { errorResponse } from "src/shared/response-standard/response";

export class RunExpectedAtUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    private readonly inventoryPurchase: PostInventoryFromPurchaseUsecase,
  ) {}

  async execute(poId: string): Promise<{ message: string }> {
    let validatedPoId: string;
    try {
      validatedPoId = new PurchaseOrderId(poId).value;
    } catch (err) {
      if (err instanceof DomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    return this.uow.runInTransaction(async (tx) => {
      const order = await this.purchaseRepo.findById(validatedPoId, tx);
      if (!order) {
        throw new NotFoundException(errorResponse("Orden no encontrada"));
      }

      if (![PurchaseOrderStatus.SENT, PurchaseOrderStatus.PARTIAL].includes(order.status)) {
        throw new BadRequestException(errorResponse("La orden no esta en estado SENT o PARTIAL"));
      }

      if (!order.expectedAt) {
        throw new BadRequestException(errorResponse("La orden no tiene expectedAt"));
      }

      await this.inventoryPurchase.execute({
        poId: order.poId,
        toWarehouseId: order.warehouseId,
        postedBy: order.createdBy,
        createdBy: order.createdBy,
        note: "Ingreso por compra",
        tx,
      });

      await this.purchaseRepo.update({ poId: order.poId, status: PurchaseOrderStatus.RECEIVED }, tx);

      return { type:"success", message: "Orden ejecutada y marcada como RECEIVED" };
    });
  }
}
