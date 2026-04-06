import { Inject } from "@nestjs/common";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { GetPaymentsByPoIdInput } from "../../dtos/payment/input/get-by-po-id.input";
import { PaymentOutput } from "../../dtos/payment/output/payment.output";
import { PaymentOutputMapper } from "../../mappers/payment-output.mapper";

export class GetPaymentsByPoIdUsecase {
  constructor(
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
  ) {}

  async execute(input: GetPaymentsByPoIdInput): Promise<PaymentOutput[]> {
    const rows = await this.paymentDocRepo.findByPoId(input.poId);

    return rows.map((row) => PaymentOutputMapper.toOutput(row));
  }
}
