import { ListingSearchSnapshot } from "../../domain/listing-search-snapshot";

export interface ListingSearchOptionOutput {
  id: string;
  label: string;
  keywords?: string[];
}

export interface ListingSearchRecentOutput<TSnapshot extends ListingSearchSnapshot = ListingSearchSnapshot> {
  recentId: string;
  label: string;
  snapshot: TSnapshot;
  lastUsedAt: Date;
}

export interface ListingSearchMetricOutput<TSnapshot extends ListingSearchSnapshot = ListingSearchSnapshot> {
  metricId: string;
  name: string;
  label: string;
  snapshot: TSnapshot;
  updatedAt: Date;
}
