import { Inject } from "@nestjs/common";
import { PAYMENT_PURCHASE_REPOSITORY, PaymentPurchaseRepository } from "src/modules/payments/domain/ports/payment-purchase.repository";
import { GetPaymentsByPoIdInput } from "../../dtos/payment/input/get-by-po-id.input";
import { PaymentOutput } from "../../dtos/payment/output/payment.output";

export class GetPaymentsByPoIdUsecase {
  constructor(
    @Inject(PAYMENT_PURCHASE_REPOSITORY)
    private readonly paymentPurchaseRepo: PaymentPurchaseRepository,
  ) {}

  async execute(input: GetPaymentsByPoIdInput): Promise<PaymentOutput[]> {
    const rows = await this.paymentPurchaseRepo.findByPoId(input.poId);

    return rows.map((row) => ({
      payDocId: row.payDocId,
      method: row.method,
      date: row.date,
      operationNumber: row.operationNumber ?? null,
      currency: row.currency,
      amount: row.amount,
      note: row.note ?? null,
      fromDocumentType: row.fromDocumentType,
      poId: row.poId,
      quotaId: row.quotaId ?? null,
    }));
  }
}
