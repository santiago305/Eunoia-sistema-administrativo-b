import { Inject, NotFoundException } from "@nestjs/common";
import {
  SALE_ORDER_STATES_REPOSITORY,
  SaleOrderStatesRepository,
} from "../../domain/ports/sale-order-states.repository";

export class GetSaleOrderStateUseCase {
  constructor(
    @Inject(SALE_ORDER_STATES_REPOSITORY)
    private readonly saleOrderStatesRepo: SaleOrderStatesRepository,
  ) {}

  async execute(input: { saleOrderStateId: string }) {
    const state = await this.saleOrderStatesRepo.findById(input.saleOrderStateId);
    if (!state) {
      throw new NotFoundException("Estado de orden de venta no encontrado");
    }
    return state;
  }
}
