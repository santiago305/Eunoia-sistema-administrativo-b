import { Inject } from "@nestjs/common";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { GetPaymentsByPoIdInput } from "../../dtos/payment/input/get-by-po-id.input";
import { PaymentOutput } from "../../dtos/payment/output/payment.output";

export class GetPaymentsByPoIdUsecase {
  constructor(
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
  ) {}

  async execute(input: GetPaymentsByPoIdInput): Promise<PaymentOutput[]> {
    const rows = await this.paymentDocRepo.findByPoId(input.poId);

    return rows.map((row) => ({
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
  }
}
