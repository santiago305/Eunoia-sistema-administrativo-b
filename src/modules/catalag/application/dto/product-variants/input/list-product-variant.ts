
export interface ListProductVariantsInput {
  productId?: string;
  productName?:string;
  productDescription?:string;
  q?:string;
  isActive?: boolean;
  sku?: string;
  barcode?: string;
  limit?:number;
  page?:number;
}