import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { ProductVar } from "../entity/product-variant";
import { Money } from "../value-object/money.vo";
import { ProductId } from "../value-object/product.vo";
import { ProductVariantWithProductInfo } from "../../application/dto/product-variants/output/variant-with-produc-info";
import { ProductVariantAttributes } from "../../application/dto/product-variants/input/attributes-product-variant";

export const PRODUCT_VARIANT = Symbol('PRODUCT_VARIANT')
export interface ProductVariantRepository {
  create(variant: ProductVar, tx?: TransactionContext): Promise<ProductVar>;

  update(params: {
    id: string;
    sku?: string;
    barcode?: string;
    attributes?: ProductVariantAttributes;
    price?: Money;
    cost?: Money;
  }, tx?: TransactionContext): Promise<ProductVar | null>;
  
  findLastCreated(tx?: TransactionContext): Promise<ProductVar | null>;

  setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void>;

  findById(id: string, tx?: TransactionContext): Promise<ProductVar | null>;
  findBySku(sku: string, tx?: TransactionContext): Promise<ProductVar | null>;
  findByBarcode(barcode: string, tx?: TransactionContext): Promise<ProductVar | null>;

  listByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVar[]>;

  listActiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVar[]>;
  listInactiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVar[]>;
  search(params: {
      productId?: ProductId;
      isActive?: boolean;
      sku?: string;
      barcode?: string;
      productName?: string;
      productDescription?: string;
      q?: string;
      page?: number;
      limit?: number;
    }, tx?: TransactionContext): Promise<{ items: ProductVariantWithProductInfo[]; total: number }>;
}
