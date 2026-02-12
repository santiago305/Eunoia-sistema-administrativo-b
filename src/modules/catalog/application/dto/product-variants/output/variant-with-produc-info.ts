import { ProductVar } from "src/modules/catalag/domain/entity/product-variant";

export interface ProductVariantWithProductInfo {
  variant: ProductVar;
  productName: string;
  productDescription: string;
}