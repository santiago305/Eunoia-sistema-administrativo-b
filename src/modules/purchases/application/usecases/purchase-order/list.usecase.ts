import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { ParseDateLocal } from "src/shared/utilidades/utils/ParseDates";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { ListPurchaseOrdersInput } from "../../dtos/purchase-order/input/list.input";
import { PurchaseOrderOutput } from "../../dtos/purchase-order/output/purchase-order.output";
import { PaymentOutput } from "src/modules/payments/application/dtos/payment/output/payment.output";

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
        const paymentOutputs: PaymentOutput[] = payments.map((p) => ({
          payDocId: p.payDocId,
          method: p.method,
          date: p.date,
          operationNumber: p.operationNumber ?? null,
          currency: p.currency,
          amount: p.amount,
          note: p.note ?? null,
          fromDocumentType: p.fromDocumentType,
          poId: p.poId ?? "",
          quotaId: p.quotaId ?? null,
        }));

        const totalPaid = paymentOutputs.reduce((sum, p) => sum + (p.amount ?? 0), 0);
        const totalPurchase = row.total?.getAmount() ?? 0;

        return {
          poId: row.poId,
          supplierId: row.supplierId,
          warehouseId: row.warehouseId,
          documentType: row.documentType,
          serie: row.serie,
          correlative: row.correlative,
          currency: row.currency,
          paymentForm: row.paymentForm,
          creditDays: row.creditDays,
          numQuotas: row.numQuotas,
          totalTaxed: row.totalTaxed.getAmount(),
          totalExempted: row.totalExempted.getAmount(),
          totalIgv: row.totalIgv.getAmount(),
          purchaseValue: row.purchaseValue.getAmount(),
          total: totalPurchase,
          totalPaid,
          totalToPay: totalPurchase - totalPaid,
          note: row.note,
          status: row.status,
          isActive: row.isActive,
          expectedAt: row.expectedAt,
          dateIssue: row.dateIssue,
          dateExpiration: row.dateExpiration,
          createdAt: row.createdAt,
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
