import { Inject } from "@nestjs/common";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import { SaveIncomeSearchMetricInput } from "../../dtos/income-search/input/save-income-search-metric.input";
import {
  hasIncomeSearchCriteria,
  sanitizeIncomeSearchSnapshot,
} from "../../support/income-search.utils";

const INCOME_SEARCH_TABLE_KEY = "income";

export class SaveIncomeSearchMetricUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(input: SaveIncomeSearchMetricInput) {
    const snapshot = sanitizeIncomeSearchSnapshot(input.snapshot);
    if (!hasIncomeSearchCriteria(snapshot)) {
      return { type: "error" as const, message: "No hay filtros para guardar en la metrica" };
    }

    const name = input.name.trim();
    if (!name) return { type: "error" as const, message: "El nombre de la metrica es obligatorio" };

    const metric = await this.searchStorage.createMetric({
      userId: input.userId,
      tableKey: INCOME_SEARCH_TABLE_KEY,
      name,
      snapshot,
    });

    return { type: "success" as const, message: "Metrica guardada correctamente", metric };
  }
}
