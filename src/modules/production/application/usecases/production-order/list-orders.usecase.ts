import { Inject, Injectable } from "@nestjs/common";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "src/modules/production/application/ports/production-order.repository";
import { ListProductionOrdersInput } from "../../dto/production-order/input/list-production-orders";
import { PaginatedProductionOrderOutput } from "../../dto/production-order/output/production-order-paginated";
import { ProductionOrderOutputMapper } from "../../mappers/production-order-output.mapper";

@Injectable()
export class ListProductionOrders {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY)
    private readonly orderRepo: ProductionOrderRepository,
  ) {}

  async execute(input: ListProductionOrdersInput): Promise<PaginatedProductionOrderOutput> {
    const result = await this.orderRepo.list(input);

    return {
      items: result.items.map((item) => ProductionOrderOutputMapper.toListItemOutput(item)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
