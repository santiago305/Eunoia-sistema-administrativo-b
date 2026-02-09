import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { ProductVar } from "../entity/product-variant";
import { Money } from "../value-object/money.vo";
import { ProductId } from "../value-object/product.vo";

export const PRODUCT_VARIANT = Symbol('PRODUCT_VARIANT')
export interface ProductVariantRepository {
  create(variant: ProductVar, tx?: TransactionContext): Promise<ProductVar>;

  update(params: {
    id: string;
    sku?: string;
    barcode?: string;
    attributes?: string;
    price?: Money;
    cost?: Money;
  }, tx?: TransactionContext): Promise<ProductVar | null>;

  setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void>;

  findById(id: string, tx?: TransactionContext): Promise<ProductVar | null>;
  findBySku(sku: string, tx?: TransactionContext): Promise<ProductVar | null>;
  findByBarcode(barcode: string, tx?: TransactionContext): Promise<ProductVar | null>;

  listByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVar[]>;

  listActiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVar[]>;
  listInactiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVar[]>;

  listAllActive(tx?: TransactionContext): Promise<ProductVar[]>;
  listAllInactive(tx?: TransactionContext): Promise<ProductVar[]>;
}
