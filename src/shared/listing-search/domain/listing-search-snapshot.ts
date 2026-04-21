export type ListingSearchRuleMode = "include" | "exclude";

export interface ListingSearchRangeValue {
  start?: string;
  end?: string;
}

export interface ListingSearchRule {
  field: string;
  operator: string;
  mode?: ListingSearchRuleMode;
  value?: string;
  values?: string[];
  range?: ListingSearchRangeValue;
}

export interface ListingSearchSnapshot {
  q?: string;
  filters: ListingSearchRule[];
}
