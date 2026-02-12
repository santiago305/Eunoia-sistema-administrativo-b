import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { ProductVariant } from "../entity/product-variant";
import { Money } from "../value-object/money.vo";
import { ProductId } from "../value-object/product.vo";
import { ProductVariantWithProductInfo } from "../../application/dto/product-variants/output/variant-with-produc-info";
import { ProductVariantAttributes } from "../../application/dto/product-variants/input/attributes-product-variant";

export const PRODUCT_VARIANT = Symbol('PRODUCT_VARIANT')
export interface ProductVariantRepository {
  create(variant: ProductVariant, tx?: TransactionContext): Promise<ProductVariant>;

  update(params: {
    id: string;
    sku?: string;
    barcode?: string;
    attributes?: ProductVariantAttributes;
    price?: Money;
    cost?: Money;
<<<<<<< HEAD:src/modules/catalog/domain/ports/product-variant.repository.ts
  }, tx?: TransactionContext): Promise<ProductVariant | null>;
=======
  }, tx?: TransactionContext): Promise<ProductVar | null>;
  
  findLastCreated(tx?: TransactionContext): Promise<ProductVar | null>;
>>>>>>> dc51daef1824e3f0b93f1af0f6fb926f48682178:src/modules/catalag/domain/ports/product-variant.repository.ts

  setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void>;

  findById(id: string, tx?: TransactionContext): Promise<ProductVariant | null>;
  findBySku(sku: string, tx?: TransactionContext): Promise<ProductVariant | null>;
  findByBarcode(barcode: string, tx?: TransactionContext): Promise<ProductVariant | null>;

  listByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]>;

  listActiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]>;
  listInactiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]>;
  search(params: {
      productId?: ProductId;
      isActive?: boolean;
      sku?: string;
      barcode?: string;
<<<<<<< HEAD:src/modules/catalog/domain/ports/product-variant.repository.ts
    }, tx?: TransactionContext): Promise<ProductVariant[]>;
=======
      productName?: string;
      productDescription?: string;
      q?: string;
      page?: number;
      limit?: number;
    }, tx?: TransactionContext): Promise<{ items: ProductVariantWithProductInfo[]; total: number }>;
>>>>>>> dc51daef1824e3f0b93f1af0f6fb926f48682178:src/modules/catalag/domain/ports/product-variant.repository.ts
}
