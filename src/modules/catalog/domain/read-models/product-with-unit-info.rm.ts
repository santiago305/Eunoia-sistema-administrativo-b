import { Product } from "../entity/product";

export interface ProductWithUnitInfo {
  product: Product;
  baseUnitName?: string;
  baseUnitCode?: string;
}
