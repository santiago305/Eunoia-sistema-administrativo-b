import { ProductType } from "src/modules/catalog/domain/value-object/productType";
import { FlatCatalogItemSourceType } from "../../products/output/flat-product-out";

export interface ChannelCatalogItemOutput {
  id: string;
  publicationId: string;
  channelCode: string;
  sourceType: FlatCatalogItemSourceType;
  familyProductId: string;
  productId: string;
  parentProductId: string | null;
  isGroupRoot: boolean;
  isOperationalItem: boolean;
  displayName: string;
  hasVariants: boolean;
  variantsCount: number;
  isVisible: boolean;
  sortOrder: number;
  priceOverride: number | null;
  baseUnitId: string;
  name: string;
  description: string | null;
  sku: string;
  customSku: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  attributes: Record<string, any>;
  baseUnitName: string;
  baseUnitCode: string;
  isActive: boolean;
  type: ProductType;
  createdAt: Date;
  updatedAt: Date | null;
}
