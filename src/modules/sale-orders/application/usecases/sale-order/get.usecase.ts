import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { SaleOrderGetOutput } from "../../dtos/sale-order-search/output/sale-order-search-state.output";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";


@Injectable()
export class GetSaleOrderUsecase {
  constructor(
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderQueryRepo: SaleOrderRepository,
  ) {}

  async execute(input: { saleOrderId: string }): Promise<SaleOrderGetOutput> {
    const order = await this.saleOrderQueryRepo.findById(input.saleOrderId);
    if (!order) {
      throw new BadRequestException("Pedido no encontrado");
    }
    return order;
  }
}