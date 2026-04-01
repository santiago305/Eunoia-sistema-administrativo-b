import { ProductionOrderItem as DomainItem } from "src/modules/production/domain/entity/production-order-item";
import { ProductionOrderItemEntity as OrmItem } from "../entities/production_order_item.entity";
import { ProductionOrderItemFactory } from "src/modules/production/domain/factories/production-order-item.factory";

export class ProductionOrderItemMapper {
  static toDomain(orm: OrmItem): DomainItem {
    return ProductionOrderItemFactory.reconstitute({
      productionItemId: orm.id,
      productionId: orm.productionId,
      finishedItemId: orm.finishedItemId,
      fromLocationId: orm.fromLocationId,
      toLocationId: orm.toLocationId,
      quantity: orm.quantity,
      wasteQty: orm.wasteQty ?? 0,
      unitCost: orm.unitCost,
    });
  }

  static toPersistence(domain: DomainItem): Partial<OrmItem> {
    return {
      id: domain.productionItemId,
      productionId: domain.productionId,
      finishedItemId: domain.finishedItemId,
      fromLocationId: domain.fromLocationId ?? null,
      toLocationId: domain.toLocationId ?? null,
      quantity: domain.quantity,
      wasteQty: domain.wasteQty ?? 0,
      unitCost: domain.unitCost,
    };
  }
}
