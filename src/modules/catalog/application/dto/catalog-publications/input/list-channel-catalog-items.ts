import { ProductType } from "src/modules/catalog/domain/value-object/productType";

export interface ListChannelCatalogItemsInput {
  channelCode: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
  type?: ProductType;
  q?: string;
}
