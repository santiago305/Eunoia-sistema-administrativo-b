import { Inject, NotFoundException } from "@nestjs/common";
import { PAYMENT_PURCHASE_REPOSITORY, PaymentPurchaseRepository } from "src/modules/payments/domain/ports/payment-purchase.repository";
import { GetPaymentInput } from "../../dtos/payment/input/get-by-id.input";
import { PaymentOutput } from "../../dtos/payment/output/payment.output";

export class GetPaymentUsecase {
  constructor(
    @Inject(PAYMENT_PURCHASE_REPOSITORY)
    private readonly paymentPurchaseRepo: PaymentPurchaseRepository,
  ) {}

  async execute(input: GetPaymentInput): Promise<PaymentOutput> {
    const row = await this.paymentPurchaseRepo.findByPayDocId(input.payDocId);
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
      poId: row.poId,
      quotaId: row.quotaId ?? null,
    };
  }
}
