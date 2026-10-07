import { Inject, Optional } from "@nestjs/common";
import { IncomeFilterInput, normalizeIncomeFilters } from "../dtos/income-filter.input";
import { INCOME_QUERY_REPOSITORY, IncomeQueryRepository } from "../../domain/ports/income-query.repository";
import {
  IncomeSearchFields,
  IncomeSearchOperators,
  type IncomeSearchRule,
} from "../dtos/income-search/income-search-snapshot";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import {
  hasIncomeSearchCriteria,
  sanitizeIncomeSearchSnapshot,
} from "../support/income-search.utils";

const INCOME_SEARCH_TABLE_KEY = "income";

export class ListIncomeUsecase {
  constructor(
    @Inject(INCOME_QUERY_REPOSITORY)
    private readonly repo: IncomeQueryRepository,
    @Optional()
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage?: ListingSearchStorageRepository,
  ) {}

  async execute(input: IncomeFilterInput = {}) {
    const filters = normalizeIncomeFilters(input);
    const searchRules: IncomeSearchRule[] = [
      ...(filters.status !== "ALL"
        ? [{ field: IncomeSearchFields.STATUS, operator: IncomeSearchOperators.IN, values: [filters.status] }]
        : []),
      ...(filters.hasEvidence !== undefined
        ? [{ field: IncomeSearchFields.HAS_EVIDENCE, operator: IncomeSearchOperators.IN, values: [String(filters.hasEvidence)] }]
        : []),
      ...(filters.filters ?? []),
    ];
    const snapshot = sanitizeIncomeSearchSnapshot({
      q: filters.q,
      filters: searchRules,
    });

    const result = await this.repo.list(filters);

    if (input.requestedBy && this.searchStorage && hasIncomeSearchCriteria(snapshot)) {
      try {
        await this.searchStorage.touchRecentSearch({
          userId: input.requestedBy,
          tableKey: INCOME_SEARCH_TABLE_KEY,
          snapshot,
        });
      } catch {
        // Persistir recientes no debe bloquear el listado de ingresos.
      }
    }

    return result;
  }
}
