import { Inject } from "@nestjs/common";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { ListPurchaseOrderItemsInput } from "../../dtos/purchase-order-item/input/list.input";
import { PurchaseOrderItemOutput } from "../../dtos/purchase-order-item/output/purchase-order-item.output";

export class ListPurchaseOrderItemsUsecase {
  constructor(
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly itemRepo: PurchaseOrderItemRepository,
  ) {}

  async execute(input: ListPurchaseOrderItemsInput): Promise<PurchaseOrderItemOutput[]> {
    const items = await this.itemRepo.getByPurchaseId(input.poId);
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
