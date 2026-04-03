import { BadRequestException, Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { AddPurchaseOrderItemInput } from "../../dtos/purchase-order-item/input/add.input";
import { PurchaseOrderItemFactory } from "src/modules/purchases/domain/factories/purchase-order-item.factory";
import { PurchaseOrderId } from "src/modules/purchases/domain/value-objects/purchase-order-id.vo";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { DomainError } from "src/modules/purchases/domain/errors/domain.error";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { errorResponse } from "src/shared/response-standard/response";

export class AddPurchaseOrderItemUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly itemRepo: PurchaseOrderItemRepository,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
  ) {}

  async execute(items: AddPurchaseOrderItemInput[], po_id: string): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      let poId: string;
      try {
        poId = new PurchaseOrderId(po_id).value;
      } catch (err) {
        if (err instanceof DomainError || (err as any)?.name === "InvalidMoneyError") {
          throw new BadRequestException({ type: "error", message: (err as Error).message });
        }
        throw err;
      }
      
      const order = await this.purchaseRepo.findById(poId, tx);
      if (!order) throw new BadRequestException(errorResponse("Orden no encontrada"));


      for (const item of items) {
        let data:any;
        try {
          data = PurchaseOrderItemFactory.createNew({
            poId,
            stockItemId: item.stockItemId as any,
            unitBase: item.unitBase as any,
            equivalence: item.equivalence as any,
            factor: item.factor as any,
            afectType: item.afectType as any,
            quantity: item.quantity as any,
            porcentageIgv: item.porcentageIgv ?? 0,
            baseWithoutIgv: item.baseWithoutIgv ?? 0,
            amountIgv: item.amountIgv ?? 0,
            unitValue: item.unitValue ?? 0,
            unitPrice: item.unitPrice ?? 0,
            purchaseValue: item.purchaseValue ?? 0,
            currency: order.currency ?? CurrencyType.PEN,
          });
        } catch (err) {
          if (err instanceof DomainError || (err as any)?.name === "InvalidMoneyError") {
            throw new BadRequestException({ type: "error", message: (err as Error).message });
          }
          throw err;
        }

        try {
          await this.itemRepo.add(data, tx);
        } catch {
          throw new BadRequestException({
            type: "error",
            message: `No se pudo agregar el item ${item}`,
          });
        }
      }

      return { type: "success", message: "Items agregado con exito" };
    });
  }
}
