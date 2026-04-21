import { Inject } from "@nestjs/common";
import { SupplierSearchStateOutput } from "../../dtos/supplier-search/output/supplier-search-state.output";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import {
  buildSupplierSearchLabel,
  sanitizeSupplierSearchSnapshot,
  SUPPLIER_ACTIVE_STATE_SEARCH_OPTIONS,
  SUPPLIER_DOCUMENT_TYPE_SEARCH_OPTIONS,
} from "../../support/supplier-search.utils";
import { SupplierSearchSnapshot } from "../../dtos/supplier-search/supplier-search-snapshot";

const SUPPLIER_SEARCH_TABLE_KEY = "suppliers";

export class GetSupplierSearchStateUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(userId: string): Promise<SupplierSearchStateOutput> {
    const state = await this.searchStorage.listState({
      userId,
      tableKey: SUPPLIER_SEARCH_TABLE_KEY,
    });

    const maps = {
      documentTypes: new Map(SUPPLIER_DOCUMENT_TYPE_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      activeStates: new Map(SUPPLIER_ACTIVE_STATE_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
    };

    return {
      recent: state.recent.map((item) => {
        const snapshot = sanitizeSupplierSearchSnapshot(item.snapshot as SupplierSearchSnapshot);
        return {
          recentId: item.recentId,
          label: buildSupplierSearchLabel(snapshot, maps),
          snapshot,
          lastUsedAt: item.lastUsedAt,
        };
      }),
      saved: state.metrics.map((item) => {
        const snapshot = sanitizeSupplierSearchSnapshot(item.snapshot as SupplierSearchSnapshot);
        return {
          metricId: item.metricId,
          name: item.name,
          label: buildSupplierSearchLabel(snapshot, maps),
          snapshot,
          updatedAt: item.updatedAt,
        };
      }),
      catalogs: {
        documentTypes: SUPPLIER_DOCUMENT_TYPE_SEARCH_OPTIONS,
        activeStates: SUPPLIER_ACTIVE_STATE_SEARCH_OPTIONS,
      },
    };
  }
}
