import { ProductId } from "../../domain/value-object/product.vo";

export interface CreateProductInput {
  name: string;
  description: string;
  isActive?: boolean;
}

export interface UpdateProductInput {
  id: string;
  name?: string;
  description?: string;
}

export interface SetProductActiveInput {
  id: string;
  isActive: boolean;
}
export interface ListProductVariantsInput {
  productId?: string;
  isActive?: boolean;
  sku?: string;
  barcode?: string;
}


export interface GetProductInput {
  id: string;
}

export interface ListProductsInput {
  isActive?: boolean;
  name?: string;
  description?: string;
}

export interface CreateProductVariantInput {
  productId: string;
  sku: string;
  barcode: string;
  attributes: string;
  price: number;
  cost: number;
  isActive?: boolean;
}

export interface UpdateProductVariantInput {
  id: string;
  sku?: string;
  barcode?: string;
  attributes?: string;
  price?: number;
  cost?: number;
}

export interface SetProductVariantActiveInput {
  id: string;
  isActive: boolean;
}

export interface GetProductVariantInput {
  id: string;
}

export interface ListProductVariantsInput {
  productId?: string;
  isActive?: boolean;
}
