import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { SALE_PAYMENT_REPOSITORY, SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";

@Injectable()
export class ListSaleOrderPaymentsUsecase {
  constructor(
    @Inject(SALE_PAYMENT_REPOSITORY)
    private readonly paymentRepo: SalePaymentRepository,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
  ) {}

  async execute(input: { saleOrderId: string }) {
    const exists = await this.saleOrderRepo.findById(input.saleOrderId);
    if (!exists) throw new BadRequestException("Pedido no encontrado");
    return this.paymentRepo.listBySaleOrderIds([input.saleOrderId]);
  }
}
