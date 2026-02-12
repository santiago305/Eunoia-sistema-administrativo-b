import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { ProductVariant } from "../entity/product-variant";
import { Money } from "../value-object/money.vo";
import { ProductId } from "../value-object/product.vo";

export const PRODUCT_VARIANT = Symbol('PRODUCT_VARIANT')
export interface ProductVariantRepository {
  create(variant: ProductVariant, tx?: TransactionContext): Promise<ProductVariant>;

  update(params: {
    id: string;
    sku?: string;
    barcode?: string;
    attributes?: string;
    price?: Money;
    cost?: Money;
  }, tx?: TransactionContext): Promise<ProductVariant | null>;

  setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void>;

  findById(id: string, tx?: TransactionContext): Promise<ProductVariant | null>;
  findBySku(sku: string, tx?: TransactionContext): Promise<ProductVariant | null>;
  findByBarcode(barcode: string, tx?: TransactionContext): Promise<ProductVariant | null>;

  listByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]>;

  listActiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]>;
  listInactiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]>;
  search(params: {
      productId?:ProductId;
      isActive?: boolean;
      sku?: string;
      barcode?: string;
    }, tx?: TransactionContext): Promise<ProductVariant[]>;
}
