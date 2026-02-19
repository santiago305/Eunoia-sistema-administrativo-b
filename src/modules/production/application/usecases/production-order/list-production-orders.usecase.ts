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
      items: result.items.map((o) => ({
        id: o.productionId!,
        status: o.status,
        serieId: o.serieId,
        correlative: o.correlative,
        reference: o.referense,
        manufactureTime: o.manufactureTime,
        fromWarehouseId: o.fromWarehouseId,
        toWarehouseId: o.toWarehouseId,
        createdAt: o.createdAt,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
