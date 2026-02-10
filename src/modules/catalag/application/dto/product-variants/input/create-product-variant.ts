export interface CreateProductVariantInput {
  productId: string;
  sku?: string;
  barcode: string;
  attributes: string;
  price: number;
  cost: number;
  isActive?: boolean;
}