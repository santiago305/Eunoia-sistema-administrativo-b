export interface UpdateCatalogPublicationInput {
  id: string;
  isVisible?: boolean;
  sortOrder?: number;
  priceOverride?: number | null;
  displayNameOverride?: string | null;
}
