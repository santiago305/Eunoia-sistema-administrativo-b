import { CreditQuotaOutput } from "src/modules/payments/application/dtos/credit-quota/output/credit-quota.output";
import { PaymentOutput } from "src/modules/payments/application/dtos/payment/output/payment.output";
import { CreditQuota } from "src/modules/payments/domain/entity/credit-quota";
import { PaymentDocument } from "src/modules/payments/domain/entity/payment-document";
import { PurchaseOrderItem } from "../../domain/entities/purchase-order-item";
import { PurchaseOrder } from "../../domain/entities/purchase-order";
import { PurchaseOrderDetailOutput } from "../dtos/purchase-order/output/purchase-order-detail.output";
import { PurchaseOrderOutput } from "../dtos/purchase-order/output/purchase-order.output";
import { PurchaseOrderItemOutput } from "../dtos/purchase-order-item/output/purchase-order-item.output";

export class PurchaseOrderOutputMapper {
  static toOrderOutput(
    order: PurchaseOrder,
    extras?: Pick<
      PurchaseOrderOutput,
      "supplierName" | "supplierDocumentNumber" | "warehouseName"
    >,
  ): PurchaseOrderOutput {
    return {
      poId: order.poId,
      supplierId: order.supplierId,
      supplierName: extras?.supplierName,
      supplierDocumentNumber: extras?.supplierDocumentNumber,
      warehouseId: order.warehouseId,
      warehouseName: extras?.warehouseName,
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
      total: order.total?.getAmount(),
      note: order.note,
      status: order.status,
      isActive: order.isActive,
      expectedAt: order.expectedAt,
      dateIssue: order.dateIssue,
      dateExpiration: order.dateExpiration,
      createdAt: order.createdAt,
      imageProdution: order.imageProdution ?? [],
    };
  }

  static toItemOutput(row: PurchaseOrderItem): PurchaseOrderItemOutput {
    return {
      poItemId: row.poItemId,
      poId: row.poId,
      stockItemId: row.stockItemId,
      unitBase: row.unitBase,
      equivalence: row.equivalence,
      factor: row.factor,
      afectType: row.afectType,
      quantity: row.quantity,
      porcentageIgv: row.porcentageIgv.getAmount(),
      baseWithoutIgv: row.baseWithoutIgv.getAmount(),
      amountIgv: row.amountIgv.getAmount(),
      unitValue: row.unitValue.getAmount(),
      unitPrice: row.unitPrice.getAmount(),
      purchaseValue: row.purchaseValue.getAmount(),
    };
  }

  static toPaymentOutput(row: PaymentDocument): PaymentOutput {
    return {
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
    };
  }

  static toQuotaOutput(row: CreditQuota): CreditQuotaOutput {
    return {
      quotaId: row.quotaId,
      number: row.number,
      expirationDate: row.expirationDate,
      paymentDate: row.paymentDate,
      totalToPay: row.totalToPay,
      totalPaid: row.totalPaid,
      createdAt: row.createdAt,
    };
  }

  static toDetailOutput(params: {
    order: PurchaseOrder;
    items: PurchaseOrderItemOutput[];
    payments: PaymentOutput[];
    quotas: CreditQuotaOutput[];
  }): PurchaseOrderDetailOutput {
    const base = this.toOrderOutput(params.order);
    const totalPaid = params.payments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0);
    const totalPurchase = params.order.total?.getAmount() ?? 0;

    return {
      ...base,
      total: totalPurchase,
      totalPaid,
      totalToPay: totalPurchase - totalPaid,
      items: params.items,
      quotas: params.quotas,
      payments: params.payments,
    };
  }
}
