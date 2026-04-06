import { Inject, NotFoundException } from "@nestjs/common";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { ListPurchaseOrderItemsInput } from "../../dtos/purchase-order-item/input/list.input";
import { PurchaseOrderItemOutput } from "../../dtos/purchase-order-item/output/purchase-order-item.output";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PurchaseOrderOutputMapper } from "../../mappers/purchase-order-output.mapper";
import { PurchaseOrderNotFoundApplicationError } from "../../errors/purchase-order-not-found.error";

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
      throw new NotFoundException(new PurchaseOrderNotFoundApplicationError().message);
    }
    const items = await this.itemRepo.getByPurchaseId(order.poId, order.currency ?? CurrencyType.PEN);
    return items.map((row) => PurchaseOrderOutputMapper.toItemOutput(row));
  }
}
