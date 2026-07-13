import { Inject } from "@nestjs/common";
import { PaymentSearchStateOutput } from "../../dtos/payment-search/output/payment-search-state.output";
import { PAYMENT_SEARCH, PaymentSearchRepository } from "src/modules/payments/domain/ports/payment-search.repository";
import {
  buildPaymentSearchLabel,
  PAYMENT_CURRENCY_SEARCH_OPTIONS,
  PAYMENT_DOCUMENT_TYPE_SEARCH_OPTIONS,
  PAYMENT_EVIDENCE_SEARCH_OPTIONS,
  PAYMENT_STATUS_SEARCH_OPTIONS,
  sanitizePaymentSearchSnapshot,
} from "../../support/payment-search.utils";

const PAYMENT_SEARCH_TABLE_KEY = "payments";

export class GetPaymentSearchStateUsecase {
  constructor(
    @Inject(PAYMENT_SEARCH)
    private readonly paymentSearchRepo: PaymentSearchRepository,
  ) {}

  async execute(userId: string): Promise<PaymentSearchStateOutput> {
    const state = await this.paymentSearchRepo.listState({
      userId,
      tableKey: PAYMENT_SEARCH_TABLE_KEY,
    });

    const maps = {
      statuses: new Map(PAYMENT_STATUS_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      currencies: new Map(PAYMENT_CURRENCY_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      documentTypes: new Map(PAYMENT_DOCUMENT_TYPE_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      evidenceStates: new Map(PAYMENT_EVIDENCE_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      paymentMethods: new Map(state.paymentMethods.map((item) => [item.paymentMethodId, item.label])),
      companyPaymentAccounts: new Map(
        state.companyPaymentAccounts.map((item) => [item.companyPaymentAccountId, item.label]),
      ),
    };

    return {
      recent: state.recent.map((item) => ({
        recentId: item.recentId,
        label: buildPaymentSearchLabel(item.snapshot, maps),
        snapshot: sanitizePaymentSearchSnapshot(item.snapshot),
        lastUsedAt: item.lastUsedAt,
      })),
      saved: state.metrics.map((item) => ({
        metricId: item.metricId,
        name: item.name,
        label: buildPaymentSearchLabel(item.snapshot, maps),
        snapshot: sanitizePaymentSearchSnapshot(item.snapshot),
        updatedAt: item.updatedAt,
      })),
      catalogs: {
        statuses: PAYMENT_STATUS_SEARCH_OPTIONS,
        currencies: PAYMENT_CURRENCY_SEARCH_OPTIONS,
        documentTypes: PAYMENT_DOCUMENT_TYPE_SEARCH_OPTIONS,
        evidenceStates: PAYMENT_EVIDENCE_SEARCH_OPTIONS,
        paymentMethods: state.paymentMethods.map((item) => ({
          id: item.paymentMethodId,
          label: item.label,
        })),
        companyPaymentAccounts: state.companyPaymentAccounts.map((item) => ({
          id: item.companyPaymentAccountId,
          label: item.label,
        })),
      },
    };
  }
}
