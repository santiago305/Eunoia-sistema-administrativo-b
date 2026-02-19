import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { ProductionOrderDetailOutput } from "../../dto/production-order/output/production-order-detail-out";

@Injectable()
export class GetProductionOrder {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
  ) {}

  async execute(params: { productionId: string }): Promise<ProductionOrderDetailOutput> {
    const result = await this.orderRepo.getByIdWithItems(params.productionId);
    if (!result) {
      throw new BadRequestException(
        {
          type:'error',
          message:'Orden de produccion no encontrada'
        }
      );
    }

    return {
      id: result.order.productionId!,
      fromWarehouseId: result.order.fromWarehouseId,
      toWarehouseId: result.order.toWarehouseId,
      serieId: result.order.serieId,
      correlative: result.order.correlative,
      status: result.order.status,
      reference: result.order.referense,
      manufactureTime: result.order.manufactureTime,
      createdAt: result.order.createdAt,
      items: result.items.map((i) => ({
        id: i.productionItemId!,
        productionId: i.productionId,
        finishedVariantId: i.finishedVariantId,
        fromLocationId: i.fromLocationId,
        toLocationId: i.toLocationId,
        quantity: i.quantity,
        unitCost: i.unitCost,
      })),
    };
  }
}
