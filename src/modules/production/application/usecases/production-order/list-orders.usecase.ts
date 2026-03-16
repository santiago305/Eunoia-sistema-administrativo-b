import { Inject, Injectable } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/domain/ports/production-order.repository";
import { ListProductionOrdersInput } from "../../dto/production-order/input/list-production-orders";
import { PaginatedProductionOrderOutput } from "../../dto/production-order/output/production-order-paginated";

@Injectable()
export class ListProductionOrders {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
  ) {}

  async execute(input: ListProductionOrdersInput): Promise<PaginatedProductionOrderOutput> {
    const result = await this.orderRepo.list(input);

    return {
      items: result.items.map((item) => ({
        productionId: item.order.productionId!,
        status: item.order.status,
        serieId: item.order.serieId,
        correlative: item.order.correlative,
        reference: item.order.referense,
        manufactureDate: item.order.manufactureDate,
        fromWarehouseId: item.order.fromWarehouseId,
        toWarehouseId: item.order.toWarehouseId,
        createdAt: item.order.createdAt,
        fromWarehouse: item.fromWarehouse,
        toWarehouse: item.toWarehouse,
        serie: item.serie,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
