import { Inject } from "@nestjs/common";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import { PackSearchStateOutput } from "../../dtos/pack-search/output/pack-search-state.output";
import { PackSearchSnapshot } from "../../dtos/pack-search/pack-search-snapshot";
import {
  buildPackSearchLabel,
  PACK_ACTIVE_STATE_SEARCH_OPTIONS,
  sanitizePackSearchSnapshot,
} from "../../support/pack-search.utils";

const PACKS_SEARCH_TABLE_KEY = "packs";

export class GetPackSearchStateUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
  ) {}

  async execute(userId: string): Promise<PackSearchStateOutput> {
    const state = await this.searchStorage.listState({ userId, tableKey: PACKS_SEARCH_TABLE_KEY });

    const maps = {
      activeStates: new Map(PACK_ACTIVE_STATE_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
    };

    return {
      recent: state.recent.map((item) => {
        const snapshot = sanitizePackSearchSnapshot(item.snapshot as PackSearchSnapshot);
        return {
          recentId: item.recentId,
          label: buildPackSearchLabel(snapshot, maps),
          snapshot,
          lastUsedAt: item.lastUsedAt,
        };
      }),
      saved: state.metrics.map((item) => {
        const snapshot = sanitizePackSearchSnapshot(item.snapshot as PackSearchSnapshot);
        return {
          metricId: item.metricId,
          name: item.name,
          label: buildPackSearchLabel(snapshot, maps),
          snapshot,
          updatedAt: item.updatedAt,
        };
      }),
      catalogs: {
        activeStates: PACK_ACTIVE_STATE_SEARCH_OPTIONS,
      },
    };
  }
}

