
export interface ListProductVariantsInput {
  productId?: string;
  productName?:string;
  productDescription?:string;
  q?:string;
  isActive?: boolean;
  sku?: string;
  barcode?: string;
  type?:string,
  limit?:number;
  page?:number;
}