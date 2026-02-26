import { ProductVariant } from "../entity/product-variant";

export interface RowMaterial {
    primaId: string;
    baseUnitId?: string;
    productName: string;
    productDescription: string | null;
    sku?: string | null;
    unitCode?: string;
    unitName?: string;
}
