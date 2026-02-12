import { ProductVariantOutput } from "../../product-variants/output/product-variant-out";
import { ProductOutput } from "./product-out";

export interface ProductDetailOutput {
  product: ProductOutput;
  variants: ProductVariantOutput[];
}