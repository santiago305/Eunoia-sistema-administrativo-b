import { BadRequestException, Inject } from "@nestjs/common";
import { UNIT_OF_WORK, UnitOfWork } from "src/shared/domain/ports/unit-of-work.port";
import { PurchaseOrderItem } from "src/modules/purchases/domain/entities/purchase-order-item";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { AddPurchaseOrderItemInput } from "../../dtos/purchase-order-item/input/add.input";
import { Money } from "src/shared/value-objets/money.vo";

export class AddPurchaseOrderItemUsecase {
  constructor(
    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly itemRepo: PurchaseOrderItemRepository,
  ) {}

  async execute(items: AddPurchaseOrderItemInput[], po_id: string): Promise<{ type: string; message: string }> {
    return this.uow.runInTransaction(async (tx) => {
      if (!po_id) {
        throw new BadRequestException({
          type: "error",
          message: "poId es requerido",
        });
      }

      for (const item of items) {

        const data = new PurchaseOrderItem(
          undefined,
          po_id,
          item.stockItemId,
          item.unitBase,
          item.equivalence,
          item.factor,
          item.afectType,
          item.quantity,
          Money.create(item.porcentageIgv ?? 0),
          Money.create(item.baseWithoutIgv ?? 0),
          Money.create(item.amountIgv ?? 0),
          Money.create(item.unitValue ?? 0),
          Money.create(item.unitPrice ?? 0),
          Money.create(item.purchaseValue ?? 0),
        );
  
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
