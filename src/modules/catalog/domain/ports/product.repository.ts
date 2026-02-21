import { TransactionContext } from "src/shared/domain/ports/transaction-context.port";
import { Product } from "../entity/product";
import { ProductVariant } from "../entity/product-variant";
import { ProductId } from "../value-object/product-id.vo";
import { ProductType } from "../value-object/productType";

export const PRODUCT_REPOSITORY = Symbol("PRODUCT_REPOSITORY");

export interface ProductRepository {
  create(prod: Product, tx?: TransactionContext): Promise<Product>;

  findById(id: ProductId, tx?: TransactionContext): Promise<Product | null>;
  findByName(name: string, tx?: TransactionContext): Promise<Product | null>;

  update(
    params: {
      id: ProductId;
      name?: string;
      description?: string;
      baseUnitId?: string;
      variantDefaulId?:string;
      type?: ProductType;
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
      type?: ProductType;
      q?: string;
      page: number;
      limit: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: Product[]; total: number }>;

  countAll(tx?: TransactionContext): Promise<number>;
  countByActive(isActive: boolean, tx?: TransactionContext): Promise<number>;
  countCreatedSince(from: Date, tx?: TransactionContext): Promise<number>;
  countUpdatedSince(from: Date, tx?: TransactionContext): Promise<number>;
  createdByMonthSince(from: Date, tx?: TransactionContext): Promise<Array<{ month: string; count: number }>>;
  latest(limit: number, tx?: TransactionContext): Promise<Array<{ id: string; name: string; isActive: boolean; createdAt: Date }>>;
}
