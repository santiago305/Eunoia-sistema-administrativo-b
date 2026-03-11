import { BadRequestException, Inject } from "@nestjs/common";
import { PURCHASE_ORDER, PurchaseOrderRepository } from "src/modules/purchases/domain/ports/purchase-order.port.repository";
import { PURCHASE_ORDER_ITEM, PurchaseOrderItemRepository } from "src/modules/purchases/domain/ports/purchase-order-item.port.repository";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { GetPurchaseOrderInput } from "../../dtos/purchase-order/input/get-by-id.input";
import { PurchaseOrderDetailOutput } from "../../dtos/purchase-order/output/purchase-order-detail.output";
import { PaymentOutput } from "src/modules/payments/application/dtos/payment/output/payment.output";
import { PurchaseOrderItemOutput } from "../../dtos/purchase-order-item/output/purchase-order-item.output";
import { CreditQuotaOutput } from "src/modules/payments/application/dtos/credit-quota/output/credit-quota.output";

export class GetPurchaseOrderUsecase {
  constructor(
    @Inject(PURCHASE_ORDER)
    private readonly purchaseRepo: PurchaseOrderRepository,
    @Inject(PURCHASE_ORDER_ITEM)
    private readonly itemRepo: PurchaseOrderItemRepository,
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
  ) {}

  async execute(input: GetPurchaseOrderInput): Promise<PurchaseOrderDetailOutput> {
    const order = await this.purchaseRepo.findById(input.poId);
    if (!order) {
      throw new BadRequestException({ type: "error", message: "Orden de compra no encontrada" });
    }

    const [items, payments, quotas] = await Promise.all([
      this.itemRepo.getByPurchaseId(order.poId),
      this.paymentDocRepo.findByPoId(order.poId),
      this.creditQuotaRepo.findByPoId(order.poId),
    ]);

    const itemOutputs: PurchaseOrderItemOutput[] = items.map((row) => ({
      poItemId: row.poItemId,
      poId: row.poId,
      stockItemId: row.stockItemId,
      afectType: row.afectType,
      quantity: row.quantity,
      porcentageIgv: row.porcentageIgv.getAmount(),
      baseWithoutIgv: row.baseWithoutIgv.getAmount(),
      amountIgv: row.amountIgv.getAmount(),
      unitValue: row.unitValue.getAmount(),
      unitPrice: row.unitPrice.getAmount(),
      purchaseValue: row.purchaseValue.getAmount(),
    }));

    const paymentOutputs: PaymentOutput[] = payments.map((row) => ({
      payDocId: row.payDocId,
      method: row.method,
      date: row.date,
      operationNumber: row.operationNumber ?? null,
      currency: row.currency,
      amount: row.amount,
      note: row.note ?? null,
      fromDocumentType: row.fromDocumentType,
      poId: row.poId ?? "",
      quotaId: row.quotaId ?? null,
    }));

    const quotaOutputs: CreditQuotaOutput[] = quotas.map((row) => ({
      quotaId: row.quotaId,
      number: row.number,
      expirationDate: row.expirationDate,
      paymentDate: row.paymentDate,
      totalToPay: row.totalToPay,
      totalPaid: row.totalPaid,
      createdAt: row.createdAt,
    }));

    const totalPaid = paymentOutputs.reduce((sum, p) => sum + (p.amount ?? 0), 0);
    const totalPurchase = order.total?.getAmount() ?? 0;

    return {
      poId: order.poId,
      supplierId: order.supplierId,
      warehouseId: order.warehouseId,
      documentType: order.documentType,
      serie: order.serie,
      correlative: order.correlative,
      currency: order.currency,
      paymentForm: order.paymentForm,
      creditDays: order.creditDays,
      numQuotas: order.numQuotas,
      totalTaxed: order.totalTaxed.getAmount(),
      totalExempted: order.totalExempted.getAmount(),
      totalIgv: order.totalIgv.getAmount(),
      purchaseValue: order.purchaseValue.getAmount(),
      total: totalPurchase,
      totalPaid,
      totalToPay: totalPurchase - totalPaid,
      items: itemOutputs,
      quotas: quotaOutputs,
      payments: paymentOutputs,
      note: order.note,
      status: order.status,
      isActive: order.isActive,
      expectedAt: order.expectedAt,
      dateIssue: order.dateIssue,
      dateExpiration: order.dateExpiration,
      createdAt: order.createdAt,
    };
  }
}
