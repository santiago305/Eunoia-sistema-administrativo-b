import { Inject } from "@nestjs/common";
import { PAYMENT_SEARCH, PaymentSearchRepository } from "src/modules/payments/domain/ports/payment-search.repository";
import { SavePaymentSearchMetricInput } from "../../dtos/payment-search/input/save-payment-search-metric.input";
import {
  hasPaymentSearchCriteria,
  sanitizePaymentSearchSnapshot,
} from "../../support/payment-search.utils";

const PAYMENT_SEARCH_TABLE_KEY = "payments";

export class SavePaymentSearchMetricUsecase {
  constructor(
    @Inject(PAYMENT_SEARCH)
    private readonly paymentSearchRepo: PaymentSearchRepository,
  ) {}

  async execute(input: SavePaymentSearchMetricInput) {
    const snapshot = sanitizePaymentSearchSnapshot(input.snapshot);
    if (!hasPaymentSearchCriteria(snapshot)) {
      return {
        type: "error" as const,
        message: "No hay filtros para guardar en la metrica",
      };
    }

    const name = input.name.trim();
    if (!name) {
      return {
        type: "error" as const,
        message: "El nombre de la metrica es obligatorio",
      };
    }

    const metric = await this.paymentSearchRepo.createMetric({
      userId: input.userId,
      tableKey: PAYMENT_SEARCH_TABLE_KEY,
      name,
      snapshot,
    });

    return {
      type: "success" as const,
      message: "Metrica guardada correctamente",
      metric,
    };
  }
}
