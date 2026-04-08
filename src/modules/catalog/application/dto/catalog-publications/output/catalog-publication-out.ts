import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";

export interface CatalogPublicationOutput {
  id: string;
  channelCode: string;
  sourceType: StockItemType;
  itemId: string;
  isVisible: boolean;
  sortOrder: number;
  priceOverride: number | null;
  displayNameOverride: string | null;
  createdAt: Date;
}
