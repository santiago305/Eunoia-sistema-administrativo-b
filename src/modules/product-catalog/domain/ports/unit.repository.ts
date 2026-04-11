import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { ProductCatalogUnit } from "../entities/unit";


export const PRODUCT_CATALOG_UNIT_REPOSITORY = Symbol("PRODUCT_CATALOG_UNIT_REPOSITORY");
export interface ProductCatalogUnitRepository {
  create(input: ProductCatalogUnit, tx?:TransactionContext): Promise<ProductCatalogUnit>;
  findById(id: string, tx?:TransactionContext): Promise<ProductCatalogUnit | null>;
  findByCode(code: string, tx?:TransactionContext): Promise<ProductCatalogUnit | null>;
  list(params?: { q?: string }, tx?:TransactionContext): Promise<ProductCatalogUnit[]>;
} 
