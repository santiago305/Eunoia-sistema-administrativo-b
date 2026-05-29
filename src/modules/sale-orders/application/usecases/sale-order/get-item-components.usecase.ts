import { Inject, Injectable } from "@nestjs/common";
import {
  SALE_ORDER_ITEM_COMPONENT_REPOSITORY,
  SaleOrderItemComponentRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import { SaleOrderComponentsOutput } from "../../dtos/sale-order-search/output/sale-order-search-state.output";

@Injectable()
export class GetSaleOrderItemComponentsUsecase {
  constructor(
    @Inject(SALE_ORDER_ITEM_COMPONENT_REPOSITORY)
    private readonly componentRepo: SaleOrderItemComponentRepository,
  ) {}

  async execute(input: { saleOrderId: string }): Promise<SaleOrderComponentsOutput> {
    return this.componentRepo.findComponentsBySaleOrderId(input.saleOrderId);
  }
}