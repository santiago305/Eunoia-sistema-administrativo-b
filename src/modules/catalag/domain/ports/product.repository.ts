import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { Product } from "../entity/product";

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

  listActive(tx?: TransactionContext): Promise<Product[]>;
  listInactive(tx?: TransactionContext): Promise<Product[]>;
  search(params: { name?: string; description?: string }, tx?: TransactionContext): Promise<Product[]>;

}
