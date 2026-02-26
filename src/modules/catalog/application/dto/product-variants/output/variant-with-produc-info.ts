import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
export interface ProductVariantWithProductInfo {
  variant: ProductVariant | null;
  productId: string;
  productName: string;
  productDescription: string | null;
  baseUnitId?: string;
  sku?: string;
  unitCode?: string;
  unitName?: string;
}
