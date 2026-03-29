import { BadRequestException, Inject, NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PurchaseOrderStatus } from "src/modules/purchases/domain/value-objects/po-status";
import { CLOCK, ClockPort } from "src/modules/inventory/domain/ports/clock.port";
import { PostInventoryFromPurchaseUsecase } from "./Inventory-purchase.usecase";
import { USER_REPOSITORY, UserRepository } from "src/modules/users/application/ports/user.repository";
import { Email } from "src/modules/users/domain/value-objects/email.vo";

export class RunExpectedAtUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Inject(CLOCK)
    private readonly clock: ClockPort,
    private readonly inventoryPurchase: PostInventoryFromPurchaseUsecase,
  ) {}

  async execute(poId: string): Promise<{ type: string; message: string }> {
    try {
      return await this.uow.runInTransaction(async (tx) => {
        const startedAt = this.clock.now();
        console.log(
          "[RunExpectedAtUsecase] start",
          JSON.stringify({ poId, startedAt: startedAt.toISOString() }),
        );

        const order = await this.purchaseRepo.findById(poId, tx);
        if (!order) {
          throw new NotFoundException({ type: "error", message: "Orden no encontrada" });
        }

        if (![PurchaseOrderStatus.SENT, PurchaseOrderStatus.PARTIAL].includes(order.status)) {
          throw new BadRequestException({ type: "error", message: "La orden no está en estado SENT o PARTIAL" });
        }


        if (!order.expectedAt) {
          throw new BadRequestException({ type: "error", message: "La orden no tiene expectedAt" });
        }


        await this.inventoryPurchase.execute({
          poId: order.poId,
          toWarehouseId: order.warehouseId,
          postedBy: order.createdBy,
          createdBy: order.createdBy,
          note: "Ingreso por compra",
        });

        await this.purchaseRepo.update(
          { poId: order.poId, status: PurchaseOrderStatus.RECEIVED },
          tx,
        );

        console.log(
          "[RunExpectedAtUsecase] success",
          JSON.stringify({
            poId,
            expectedAt: order.expectedAt.toISOString(),
            finishedAt: this.clock.now().toISOString(),
          }),
        );
        return { type: "success", message: "Orden ejecutada y marcada como RECEIVED" };
      });
    } catch (err) {
      await this.purchaseRepo.update({
        poId,
        status: PurchaseOrderStatus.PARTIAL,
      });
      console.log(
        "[RunExpectedAtUsecase] failure",
        JSON.stringify({
          poId,
          failedAt: this.clock.now().toISOString(),
        }),
      );
      throw new BadRequestException({ type: "error", message: err });
    }
  }
}
