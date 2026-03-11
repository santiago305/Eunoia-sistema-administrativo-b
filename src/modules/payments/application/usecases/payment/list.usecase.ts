import { Inject } from "@nestjs/common";
import { PaginatedResult } from "src/shared/utilidades/dto/paginateResult";
import { PAYMENT_DOCUMENT_REPOSITORY, PaymentDocumentRepository } from "src/modules/payments/domain/ports/payment-document.repository";
import { ListPaymentsInput } from "../../dtos/payment/input/list.input";
import { PaymentOutput } from "../../dtos/payment/output/payment.output";

export class ListPaymentsUsecase {
  constructor(
    @Inject(PAYMENT_DOCUMENT_REPOSITORY)
    private readonly paymentDocRepo: PaymentDocumentRepository,
  ) {}

  async execute(input: ListPaymentsInput): Promise<PaginatedResult<PaymentOutput>> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 10;

    const { items, total } = await this.paymentDocRepo.list({
      poId: input.poId,
      quotaId: input.quotaId,
      page,
      limit,
    });

    return {
      items: items.map((row) => ({
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
      })),
      total,
      page,
      limit,
    };
  }
}
