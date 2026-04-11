import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { ProductCatalogEquivalence } from "../entities/equivalence";

export const PRODUCT_CATALOG_EQUIVALENCE_REPOSITORY = Symbol("PRODUCT_CATALOG_EQUIVALENCE_REPOSITORY");

export interface ProductCatalogEquivalenceRepository {
  create(input: ProductCatalogEquivalence, tx?: TransactionContext): Promise<ProductCatalogEquivalence>;
  delete(id: string, tx?: TransactionContext): Promise<void>;
  findById(id: string, tx?: TransactionContext): Promise<ProductCatalogEquivalence | null>;
  listByProductId(productId: string, tx?: TransactionContext): Promise<ProductCatalogEquivalence[]>;
}
