import { Inject } from "@nestjs/common";
import {
  SALE_ORDER_STATES_REPOSITORY,
  SaleOrderStatesRepository,
} from "../../domain/ports/sale-order-states.repository";

export class ListSaleOrderStatesUseCase {
  constructor(
    @Inject(SALE_ORDER_STATES_REPOSITORY)
    private readonly saleOrderStatesRepo: SaleOrderStatesRepository,
  ) {}

  execute() {
    return this.saleOrderStatesRepo.list();
  }
}
