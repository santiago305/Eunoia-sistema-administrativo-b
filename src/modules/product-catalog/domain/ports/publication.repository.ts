export const PRODUCT_CATALOG_PUBLICATION_REPOSITORY = Symbol("PRODUCT_CATALOG_PUBLICATION_REPOSITORY");

export interface ProductCatalogChannelPublication {
  id: string;
  channelCode: string;
  skuId: string;
  isVisible: boolean;
  sortOrder: number;
  priceOverride: number | null;
  displayNameOverride: string | null;
  createdAt: Date;
}

export interface ProductCatalogPublishedSku {
  publicationId: string;
  channelCode: string;
  skuId: string;
  productId: string;
  productName: string;
  skuName: string;
  backendSku: string;
  customSku: string | null;
  barcode: string | null;
  displayName: string;
  isVisible: boolean;
  sortOrder: number;
  price: number;
  cost: number;
  isActive: boolean;
  attributes: Array<{ code: string; name: string | null; value: string }>;
}

export interface ProductCatalogPublicationRepository {
  create(input: {
    channelCode: string;
    skuId: string;
    isVisible: boolean;
    sortOrder: number;
    priceOverride: number | null;
    displayNameOverride: string | null;
  }): Promise<ProductCatalogChannelPublication>;
  update(
    id: string,
    patch: Partial<Pick<ProductCatalogChannelPublication, "isVisible" | "sortOrder" | "priceOverride" | "displayNameOverride">>,
  ): Promise<ProductCatalogChannelPublication | null>;
  findByChannelAndSku(channelCode: string, skuId: string): Promise<ProductCatalogChannelPublication | null>;
  listByChannel(params: {
    channelCode: string;
    page: number;
    limit: number;
    q?: string;
    isActive?: boolean;
  }): Promise<{ items: ProductCatalogPublishedSku[]; total: number }>;
}
