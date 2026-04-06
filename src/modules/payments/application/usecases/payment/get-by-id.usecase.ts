import { Inject, NotFoundException } from "@nestjs/common";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { GetPaymentInput } from "../../dtos/payment/input/get-by-id.input";
import { PaymentOutput } from "../../dtos/payment/output/payment.output";
import { PaymentOutputMapper } from "../../mappers/payment-output.mapper";
import { PaymentNotFoundError } from "../../errors/payment-not-found.error";

export class GetPaymentUsecase {
  constructor(
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
  ) {}

  async execute(input: GetPaymentInput): Promise<PaymentOutput> {
    const row = await this.paymentDocRepo.findById(input.payDocId);
    if (!row) {
      throw new NotFoundException(new PaymentNotFoundError().message);
    }

    return PaymentOutputMapper.toOutput(row);
  }
}
