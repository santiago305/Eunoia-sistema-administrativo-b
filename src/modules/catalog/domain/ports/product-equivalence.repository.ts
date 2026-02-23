import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { ProductEquivalence } from "../entity/product-equivalence";


export const PRODUCT_EQUIVALENCE_REPOSITORY = Symbol("PRODUCT_EQUIVALENCE_REPOSITORY");

export interface ProductEquivalenceRepository {
  create(equivalence: ProductEquivalence, tx?: TransactionContext): Promise<ProductEquivalence>;
  listByProductId(productId: string, tx?: TransactionContext): Promise<ProductEquivalence[]>;
  findById(id: string, tx?: TransactionContext): Promise<ProductEquivalence | null>;
  deleteById(id: string, tx?: TransactionContext): Promise<void>;
}
