import { BadRequestException, Inject } from "@nestjs/common";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { ListPurchaseOrderItemsInput } from "../../dtos/purchase-order-item/input/list.input";
import { PurchaseOrderItemOutput } from "../../dtos/purchase-order-item/output/purchase-order-item.output";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";

export class ListPurchaseOrderItemsUsecase {
  constructor(
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly itemRepo: PurchaseOrderItemRepository,
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
  ) {}

  async execute(input: ListPurchaseOrderItemsInput): Promise<PurchaseOrderItemOutput[]> {
    const order = await this.purchaseRepo.findById(input.poId);
    if (!order) {
      throw new BadRequestException({ type: "error", message: "Orden de compra no encontrada" });
    }
    const items = await this.itemRepo.getByPurchaseId(order.poId, order.currency ?? CurrencyType.PEN);
    return items.map((row) => ({
      poItemId: row.poItemId,
      poId: row.poId,
      stockItemId: row.stockItemId,
      afectType: row.afectType,
      quantity: row.quantity,
      porcentageIgv: row.porcentageIgv.getAmount(),
      baseWithoutIgv: row.baseWithoutIgv.getAmount(),
      amountIgv: row.amountIgv.getAmount(),
      unitValue: row.unitValue.getAmount(),
      unitPrice: row.unitPrice.getAmount(),
      purchaseValue: row.purchaseValue.getAmount(),
    }));
  }
}
