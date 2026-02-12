import { ProductVariant } from 'src/modules/catalog/domain/entity/product-variant';
export interface ProductVariantWithProductInfo {
  variant: ProductVariant;
  productName: string;
  productDescription: string;
}
