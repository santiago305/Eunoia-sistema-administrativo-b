export interface ProductOutput {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductDetailOutput {
  product: ProductOutput;
  variants: ProductVariantOutput[];
}

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
