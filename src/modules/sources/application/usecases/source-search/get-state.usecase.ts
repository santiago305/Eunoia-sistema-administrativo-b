import { Inject } from "@nestjs/common";
import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from "src/shared/listing-search/domain/listing-search.repository";
import { SourceSearchStateOutput } from "../../dtos/source-search/output/source-search-state.output";
import { SourceSearchSnapshot } from "../../dtos/source-search/source-search-snapshot";
import {
  buildSourceSearchLabel,
  sanitizeSourceSearchSnapshot,
  SOURCE_ACTIVE_STATE_SEARCH_OPTIONS,
} from "../../support/source-search.utils";

const SOURCES_SEARCH_TABLE_KEY = "sources";

export class GetSourceSearchStateUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(userId: string): Promise<SourceSearchStateOutput> {
    const state = await this.searchStorage.listState({ userId, tableKey: SOURCES_SEARCH_TABLE_KEY });

    const maps = {
      activeStates: new Map(SOURCE_ACTIVE_STATE_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
    };

    return {
      recent: state.recent.map((item) => {
        const snapshot = sanitizeSourceSearchSnapshot(item.snapshot as SourceSearchSnapshot);
        return {
          recentId: item.recentId,
          label: buildSourceSearchLabel(snapshot, maps),
          snapshot,
          lastUsedAt: item.lastUsedAt,
        };
      }),
      saved: state.metrics.map((item) => {
        const snapshot = sanitizeSourceSearchSnapshot(item.snapshot as SourceSearchSnapshot);
        return {
          metricId: item.metricId,
          name: item.name,
          label: buildSourceSearchLabel(snapshot, maps),
          snapshot,
          updatedAt: item.updatedAt,
        };
      }),
      catalogs: {
        activeStates: SOURCE_ACTIVE_STATE_SEARCH_OPTIONS,
      },
    };
  }
}

