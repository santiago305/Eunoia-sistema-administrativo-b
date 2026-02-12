import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { Product } from "../entity/product";
import { ProductVar } from "../entity/product-variant";

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
export interface ProductRepository {
  created(prod: Product, tx?: TransactionContext): Promise<Product>;
  findById(id: string, tx?: TransactionContext): Promise<Product | null>;
  updated(params: {
    id: string;
    name?: string;
    description?: string;
  }, tx?: TransactionContext): Promise<Product | null>;

  setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
  setAllVariantsActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
  getByIdWithVariants(
      id: string,
      tx?: TransactionContext,
    ): Promise<{ product: Product; items: ProductVar[] } | null>;
  listVariants(id: string, tx?: TransactionContext): Promise<ProductVar[]>;

  listActive(tx?: TransactionContext): Promise<Product[]>;
  listInactive(tx?: TransactionContext): Promise<Product[]>;
  searchPaginated(params: {
    isActive?: boolean;
    name?: string;
    description?: string;
    q?:string;
    page: number;
    limit: number;
  }, tx?: TransactionContext): Promise<{ items: Product[]; total: number }>;
}
