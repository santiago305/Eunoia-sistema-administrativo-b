import { Inject } from "@nestjs/common";
import {
  RECURRING_PURCHASE_TEMPLATE_REPOSITORY,
  RecurringPurchaseTemplateListParams,
  RecurringPurchaseTemplateRepository,
} from "../../domain/ports/recurring-purchase-template.repository";
import {
  RECURRING_PURCHASE_SEARCH,
  RecurringPurchaseSearchRepository,
} from "../../domain/ports/recurring-purchase-search.repository";
import { toRecurringPurchaseOutput } from "../mappers/recurring-purchase-output.mapper";
import {
  hasRecurringPurchaseSearchCriteria,
  sanitizeRecurringPurchaseSearchSnapshot,
} from "../support/recurring-purchase-search.utils";

const RECURRING_PURCHASE_SEARCH_TABLE_KEY = "recurring-purchases";

export class ListRecurringPurchasesUsecase {
  constructor(
    @Inject(RECURRING_PURCHASE_TEMPLATE_REPOSITORY)
    private readonly repo: RecurringPurchaseTemplateRepository,
    @Inject(RECURRING_PURCHASE_SEARCH)
    private readonly searchRepo: RecurringPurchaseSearchRepository,
  ) {}

  async execute(input: RecurringPurchaseTemplateListParams) {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? input.limit : 25;
    const snapshot = sanitizeRecurringPurchaseSearchSnapshot({
      q: input.q,
      filters: input.filters ?? [],
    });
    const result = await this.repo.list({
      ...input,
      filters: snapshot.filters,
      page,
      limit,
    });
    if (input.requestedBy && hasRecurringPurchaseSearchCriteria(snapshot)) {
      await this.searchRepo.touchRecentSearch({
        userId: input.requestedBy,
        tableKey: RECURRING_PURCHASE_SEARCH_TABLE_KEY,
        snapshot,
      });
    }
    const totalPages = Math.max(Math.ceil(result.total / result.limit), 1);
    return {
      items: result.items.map(toRecurringPurchaseOutput),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages,
      hasPrev: result.page > 1,
      hasNext: result.page < totalPages,
    };
  }
}
