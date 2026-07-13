import { Inject } from "@nestjs/common";
import { PAYMENT_SEARCH, PaymentSearchRepository } from "src/modules/payments/domain/ports/payment-search.repository";

const PAYMENT_SEARCH_TABLE_KEY = "payments";

export class DeletePaymentSearchMetricUsecase {
  constructor(
    @Inject(PAYMENT_SEARCH)
    private readonly paymentSearchRepo: PaymentSearchRepository,
  ) {}

  async execute(userId: string, metricId: string) {
    const deleted = await this.paymentSearchRepo.deleteMetric({
      userId,
      tableKey: PAYMENT_SEARCH_TABLE_KEY,
      metricId,
    });

    return {
      type: deleted ? ("success" as const) : ("error" as const),
      message: deleted
        ? "Metrica eliminada correctamente"
        : "No se encontro la metrica solicitada",
    };
  }
}
