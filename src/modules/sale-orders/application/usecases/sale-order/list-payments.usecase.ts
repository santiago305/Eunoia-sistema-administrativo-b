import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { SALE_PAYMENT_REPOSITORY, SalePaymentRepository } from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { SALE_ORDER_REPOSITORY, SaleOrderRepository } from "src/modules/sale-orders/domain/ports/sale-order.repository";
import { SaleOrderAccessPolicyService } from "../../services/sale-order-access-policy.service";

@Injectable()
export class ListSaleOrderPaymentsUsecase {
  constructor(
    @Inject(SALE_PAYMENT_REPOSITORY)
    private readonly paymentRepo: SalePaymentRepository,
    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,
    private readonly accessPolicy?: SaleOrderAccessPolicyService,
  ) {}

  async execute(input: { saleOrderId: string; requestedBy?: string }) {
    const readContext = input.requestedBy && this.accessPolicy
      ? await this.accessPolicy.resolveReadContext(input.requestedBy)
      : undefined;
    const order = await this.saleOrderRepo.findById(input.saleOrderId, readContext);
    if (!order) throw new BadRequestException("Pedido no encontrado");
    const payments = await this.paymentRepo.listBySaleOrderIds([input.saleOrderId]);
    if (!readContext || readContext.includeIncomePayments === undefined) return payments;
    const visiblePaymentIds = new Set(order.payments.map((payment) => payment.id));
    return payments.filter((payment) => visiblePaymentIds.has(payment.id));
  }
}
