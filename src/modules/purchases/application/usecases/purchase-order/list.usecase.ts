import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { ParseDateLocal } from "src/shared/utilidades/utils/ParseDates";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { ListPurchaseOrdersInput } from "../../dtos/purchase-order/input/list.input";
import { PurchaseOrderOutput } from "../../dtos/purchase-order/output/purchase-order.output";
import { PurchaseOrderOutputMapper } from "../../mappers/purchase-order-output.mapper";

export class ListPurchaseOrdersUsecase {
  constructor(
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
  ) {}

  async execute(input: ListPurchaseOrdersInput): Promise<PaginatedResult<PurchaseOrderOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { items, total } = await this.purchaseRepo.list({
      status: input.status,
      supplierId: input.supplierId,
      warehouseId: input.warehouseId,
      documentType: input.documentType,
      number: input.number,
      from: input.from ? ParseDateLocal(input.from, "start") : undefined,
      to: input.to ? ParseDateLocal(input.to, "end") : undefined,
      page,
      limit,
    });

    const itemsWithPayments = await Promise.all(
      items.map(async (row) => {
        const payments = await this.paymentDocRepo.findByPoId(row.poId);
        const paymentOutputs = payments.map((payment) =>
          PurchaseOrderOutputMapper.toPaymentOutput(payment),
        );

        const totalPaid = paymentOutputs.reduce((sum, p) => sum + (p.amount ?? 0), 0);
        const mappedOrder = PurchaseOrderOutputMapper.toOrderOutput(row);

        return {
          ...mappedOrder,
          totalPaid,
          totalToPay: mappedOrder.total - totalPaid,
        };
      }),
    );

    return {
      items: itemsWithPayments,
      total,
      page,
      limit,
    };
  }
}
