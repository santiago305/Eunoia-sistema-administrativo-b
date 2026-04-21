import { ListingSearchSnapshot } from "./listing-search-snapshot";

export const LISTING_SEARCH_STORAGE = Symbol("LISTING_SEARCH_STORAGE");

export interface ListingSearchRecentRecord<TSnapshot extends ListingSearchSnapshot = ListingSearchSnapshot> {
  recentId: string;
  snapshot: TSnapshot;
  lastUsedAt: Date;
}

export interface ListingSearchMetricRecord<TSnapshot extends ListingSearchSnapshot = ListingSearchSnapshot> {
  metricId: string;
  name: string;
  snapshot: TSnapshot;
  updatedAt: Date;
}

export interface ListingSearchStateRecord<TSnapshot extends ListingSearchSnapshot = ListingSearchSnapshot> {
  recent: ListingSearchRecentRecord<TSnapshot>[];
  metrics: ListingSearchMetricRecord<TSnapshot>[];
}

export interface ListingSearchStorageRepository {
  touchRecentSearch(params: {
    userId: string;
    tableKey: string;
    snapshot: ListingSearchSnapshot;
  }): Promise<void>;
  listState(params: {
    userId: string;
    tableKey: string;
  }): Promise<ListingSearchStateRecord>;
  createMetric(params: {
    userId: string;
    tableKey: string;
    name: string;
    snapshot: ListingSearchSnapshot;
  }): Promise<ListingSearchMetricRecord>;
  deleteMetric(params: { userId: string; tableKey: string; metricId: string }): Promise<boolean>;
}
