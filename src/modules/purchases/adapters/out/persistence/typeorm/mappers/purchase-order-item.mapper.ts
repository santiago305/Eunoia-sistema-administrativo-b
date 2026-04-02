import { PurchaseOrderItem } from "src/modules/purchases/domain/entities/purchase-order-item";
import { PurchaseOrderItemFactory } from "src/modules/purchases/domain/factories/purchase-order-item.factory";
import { CurrencyType } from "src/modules/purchases/domain/value-objects/currency-type";
import { PurchaseOrderItemEntity } from "../entities/purchase-order-item.entity";

export class PurchaseOrderItemMapper {
  static toDomain(orm: PurchaseOrderItemEntity, currency: CurrencyType): PurchaseOrderItem {
    return PurchaseOrderItemFactory.reconstitute({
      poItemId: orm.id,
      poId: orm.poId,
      stockItemId: orm.stockItemId,
      unitBase: orm.unitBase ?? "",
      equivalence: orm.equivalencia ?? "",
      factor: orm.factor ?? 1,
      afectType: orm.afectType,
      quantity: Number(orm.quantity ?? 0),
      porcentageIgv: Number(orm.porcentageIgv ?? 0),
      baseWithoutIgv: Number(orm.baseWithoutIgv ?? 0),
      amountIgv: Number(orm.amountIgv ?? 0),
      unitValue: Number(orm.unitValue ?? 0),
      unitPrice: Number(orm.unitPrice ?? 0),
      purchaseValue: Number(orm.purchaseValue ?? 0),
      currency,
    });
  }

  static toPersistence(domain: PurchaseOrderItem): Partial<PurchaseOrderItemEntity> {
    return {
      id: domain.poItemId,
      poId: domain.poId,
      stockItemId: domain.stockItemId,
      unitBase: domain.unitBase ?? null,
      equivalencia: domain.equivalence ?? null,
      factor: domain.factor ?? 1,
      afectType: domain.afectType ?? null,
      quantity: domain.quantity,
      porcentageIgv: domain.porcentageIgv.getAmount(),
      baseWithoutIgv: domain.baseWithoutIgv.getAmount(),
      amountIgv: domain.amountIgv.getAmount(),
      unitValue: domain.unitValue.getAmount(),
      unitPrice: domain.unitPrice.getAmount(),
      purchaseValue: domain.purchaseValue.getAmount(),
    };
  }
}
