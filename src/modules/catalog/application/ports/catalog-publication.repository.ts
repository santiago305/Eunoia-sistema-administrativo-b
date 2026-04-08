import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { ChannelCatalogItemOutput } from "../dto/catalog-publications/output/channel-catalog-item-out";
import { CatalogPublicationOutput } from "../dto/catalog-publications/output/catalog-publication-out";
import { ProductType } from "../../domain/value-object/productType";
import { StockItemType } from "src/modules/inventory/domain/value-objects/stock-item-type";

export const CATALOG_PUBLICATION_REPOSITORY = Symbol("CATALOG_PUBLICATION_REPOSITORY");

export interface CatalogPublicationRepository {
  create(params: {
    channelCode: string;
    sourceType: StockItemType;
    itemId: string;
    isVisible: boolean;
    sortOrder: number;
    priceOverride: number | null;
    displayNameOverride: string | null;
  }, tx?: TransactionContext): Promise<CatalogPublicationOutput>;
  update(params: {
    id: string;
    isVisible?: boolean;
    sortOrder?: number;
    priceOverride?: number | null;
    displayNameOverride?: string | null;
  }, tx?: TransactionContext): Promise<CatalogPublicationOutput | null>;
  findById(id: string, tx?: TransactionContext): Promise<CatalogPublicationOutput | null>;
  findByChannelAndItem(
    channelCode: string,
    sourceType: StockItemType,
    itemId: string,
    tx?: TransactionContext,
  ): Promise<CatalogPublicationOutput | null>;
  searchPublishedFlat(
    params: {
      channelCode: string;
      isActive?: boolean;
      type?: ProductType;
      q?: string;
      page: number;
      limit: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: ChannelCatalogItemOutput[]; total: number }>;
}
