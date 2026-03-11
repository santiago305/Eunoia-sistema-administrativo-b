import { Inject, NotFoundException } from "@nestjs/common";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { GetPaymentInput } from "../../dtos/payment/input/get-by-id.input";
import { PaymentOutput } from "../../dtos/payment/output/payment.output";

export class GetPaymentUsecase {
  constructor(
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
  ) {}

  async execute(input: GetPaymentInput): Promise<PaymentOutput> {
    const row = await this.paymentDocRepo.findById(input.payDocId);
    if (!row) {
      throw new NotFoundException({
        type: "error",
        message: "Pago no encontrado",
      });
    }

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
}
