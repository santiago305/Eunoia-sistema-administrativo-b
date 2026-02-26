import { ProductVariant } from "../entity/product-variant";

export interface ProductVariantWithProductInfo {
  variant: ProductVariant | null;
  productName: string;
  productDescription: string | null;
  baseUnitId?: string;
  unitCode?: string;
  unitName?: string;
}
