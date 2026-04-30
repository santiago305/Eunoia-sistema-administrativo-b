import { ProductionOrderDetailOutput } from "../dto/production-order/output/production-order-detail-out";
import { ProductionOrderItemOutput } from "../dto/production-order/output/production-order-item-out";
import { ProductionOrderOutput } from "../dto/production-order/output/production-order-out";
import { PaginatedProductionOrderOutput } from "../dto/production-order/output/production-order-paginated";
import { ProductionOrder } from "../../domain/entity/production-order.entity";
import { ProductionOrderItem } from "../../domain/entity/production-order-item";
import { ProductionOrderListItemRM } from "../../domain/read-models/production-order-list-item.rm";

export class ProductionOrderOutputMapper {
  static toOrderOutput(order: ProductionOrder): ProductionOrderOutput {
    return {
      id: order.productionId,
      fromWarehouseId: order.fromWarehouseId,
      toWarehouseId: order.toWarehouseId,
      serieId: order.serieId,
      correlative: order.correlative,
      status: order.status,
      manufactureDate: order.manufactureDate,
      reference: order.reference ?? null,
      createdAt: order.createdAt,
      imageProdution: order.imageProdution ?? [],
    };
  }

  static toItemOutput(
    item: ProductionOrderItem,
    extra?: { finishedItemType?: ProductionOrderItemOutput["finishedItemType"] },
  ): ProductionOrderItemOutput {
    return {
      id: item.productionItemId,
      productionId: item.productionId,
      finishedItemId: item.finishedItemId,
      finishedItemType: extra?.finishedItemType ?? null,
      fromLocationId: item.fromLocationId,
      toLocationId: item.toLocationId,
      quantity: item.quantity,
      wasteQty: item.wasteQty ?? 0,
      unitCost: item.unitCost,
    };
  }

  static toListItemOutput(item: ProductionOrderListItemRM): PaginatedProductionOrderOutput["items"][number] {
    return {
      productionId: item.order.productionId!,
      status: item.order.status,
      serieId: item.order.serieId,
      correlative: item.order.correlative,
      reference: item.order.reference,
      manufactureDate: item.order.manufactureDate,
      fromWarehouseId: item.order.fromWarehouseId,
      toWarehouseId: item.order.toWarehouseId,
      createdAt: item.order.createdAt,
      imageProdution: item.order.imageProdution ?? [],
      fromWarehouse: item.fromWarehouse,
      toWarehouse: item.toWarehouse,
      serie: item.serie,
    };
  }

  static toDetailOutput(params: {
    order: ProductionOrder;
    serie: ProductionOrderDetailOutput["serie"];
    items: ProductionOrderDetailOutput["items"];
  }): ProductionOrderDetailOutput {
    return {
      id: params.order.productionId!,
      fromWarehouseId: params.order.fromWarehouseId,
      toWarehouseId: params.order.toWarehouseId,
      serieId: params.order.serieId,
      serie: params.serie,
      correlative: params.order.correlative,
      status: params.order.status,
      reference: params.order.reference,
      manufactureDate: params.order.manufactureDate,
      createdAt: params.order.createdAt,
      imageProdution: params.order.imageProdution ?? [],
      items: params.items,
    };
  }
}
