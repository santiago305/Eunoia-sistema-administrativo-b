import { PaymentDocument } from "../../domain/entity/payment-document";
import { PaymentOutput } from "../dtos/payment/output/payment.output";

export class PaymentOutputMapper {
  static toOutput(row: PaymentDocument): PaymentOutput {
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
      status: row.status,
      requestedByUserId: row.requestedByUserId ?? null,
      approvedByUserId: row.approvedByUserId ?? null,
      rejectedByUserId: row.rejectedByUserId ?? null,
      approvedAt: row.approvedAt ?? null,
      rejectedAt: row.rejectedAt ?? null,
      rejectionReason: row.rejectionReason ?? null,
    };
  }
}
