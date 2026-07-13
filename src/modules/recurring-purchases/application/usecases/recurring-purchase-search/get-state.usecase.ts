import { Inject } from "@nestjs/common";
import {
  RECURRING_PURCHASE_SEARCH,
  RecurringPurchaseSearchRepository,
} from "src/modules/recurring-purchases/domain/ports/recurring-purchase-search.repository";
import { RecurringPurchaseSearchStateOutput } from "../../dtos/recurring-purchase-search/output/recurring-purchase-search-state.output";
import {
  buildRecurringPurchaseSearchLabel,
  RECURRING_PURCHASE_CURRENCY_SEARCH_OPTIONS,
  RECURRING_PURCHASE_FREQUENCY_SEARCH_OPTIONS,
  RECURRING_PURCHASE_PAYMENT_STATUS_SEARCH_OPTIONS,
  RECURRING_PURCHASE_STATUS_SEARCH_OPTIONS,
  RECURRING_PURCHASE_TYPE_SEARCH_OPTIONS,
  sanitizeRecurringPurchaseSearchSnapshot,
} from "../../support/recurring-purchase-search.utils";

const RECURRING_PURCHASE_SEARCH_TABLE_KEY = "recurring-purchases";

export class GetRecurringPurchaseSearchStateUsecase {
  constructor(
    @Inject(RECURRING_PURCHASE_SEARCH)
    private readonly searchRepo: RecurringPurchaseSearchRepository,
  ) {}

  async execute(userId: string): Promise<RecurringPurchaseSearchStateOutput> {
    const state = await this.searchRepo.listState({
      userId,
      tableKey: RECURRING_PURCHASE_SEARCH_TABLE_KEY,
    });

    const maps = {
      suppliers: new Map(state.suppliers.map((item) => [item.supplierId, item.label])),
      statuses: new Map(RECURRING_PURCHASE_STATUS_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      frequencies: new Map(RECURRING_PURCHASE_FREQUENCY_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      purchaseTypes: new Map(RECURRING_PURCHASE_TYPE_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      currencies: new Map(RECURRING_PURCHASE_CURRENCY_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      paymentStatuses: new Map(RECURRING_PURCHASE_PAYMENT_STATUS_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
    };

    return {
      recent: state.recent.map((item) => ({
        recentId: item.recentId,
        label: buildRecurringPurchaseSearchLabel(item.snapshot, maps),
        snapshot: sanitizeRecurringPurchaseSearchSnapshot(item.snapshot),
        lastUsedAt: item.lastUsedAt,
      })),
      saved: state.metrics.map((item) => ({
        metricId: item.metricId,
        name: item.name,
        label: buildRecurringPurchaseSearchLabel(item.snapshot, maps),
        snapshot: sanitizeRecurringPurchaseSearchSnapshot(item.snapshot),
        updatedAt: item.updatedAt,
      })),
      catalogs: {
        suppliers: state.suppliers.map((item) => ({ id: item.supplierId, label: item.label })),
        statuses: RECURRING_PURCHASE_STATUS_SEARCH_OPTIONS,
        frequencies: RECURRING_PURCHASE_FREQUENCY_SEARCH_OPTIONS,
        purchaseTypes: RECURRING_PURCHASE_TYPE_SEARCH_OPTIONS,
        currencies: RECURRING_PURCHASE_CURRENCY_SEARCH_OPTIONS,
        paymentStatuses: RECURRING_PURCHASE_PAYMENT_STATUS_SEARCH_OPTIONS,
      },
    };
  }
}
