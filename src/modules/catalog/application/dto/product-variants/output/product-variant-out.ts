export interface ProductVariantOutput {
  id: string;
  productId: string;
  sku: string;
  barcode: string;
  attributes: string;
  price: number;
  cost: number;
  isActive: boolean;
  createdAt?: Date;
}
