import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { Product } from "../entity/product";
import { ProductVariant } from "../entity/product-variant";
import { ProductId } from "../value-object/product-id.vo";

export const PRODUCT_REPOSITORY = Symbol("PRODUCT_REPOSITORY");

export interface ProductRepository {
  created(prod: Product, tx?: TransactionContext): Promise<Product>;

  findById(id: ProductId, tx?: TransactionContext): Promise<Product | null>;

  updated(
    params: {
      id: ProductId;
      name?: string;
      description?: string;
    },
    tx?: TransactionContext,
  ): Promise<Product | null>;

  setActive(id: ProductId, isActive: boolean, tx?: TransactionContext): Promise<void>;

  setAllVariantsActive(id: ProductId, isActive: boolean, tx?: TransactionContext): Promise<void>;

  getByIdWithVariants(
    id: ProductId,
    tx?: TransactionContext,
  ): Promise<{ product: Product; items: ProductVariant[] } | null>;

  listVariants(id: ProductId, tx?: TransactionContext): Promise<ProductVariant[]>;

  listActive(tx?: TransactionContext): Promise<Product[]>;
  listInactive(tx?: TransactionContext): Promise<Product[]>;

  searchPaginated(
    params: {
      isActive?: boolean;
      name?: string;
      description?: string;
      q?: string;
      page: number;
      limit: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: Product[]; total: number }>;
}
