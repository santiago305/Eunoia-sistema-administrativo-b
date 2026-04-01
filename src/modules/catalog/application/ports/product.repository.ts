import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Product } from "../../domain/entity/product";
import { ProductVariant } from "../../domain/entity/product-variant";
import { ProductWithUnitInfo } from "../../domain/read-models/product-with-unit-info.rm";
import { RowMaterial } from "../../domain/read-models/row-materials";
import { Money } from "../../domain/value-object/money.vo";
import { ProductId } from "../../domain/value-object/product-id.vo";
import { ProductType } from "../../domain/value-object/productType";
import { AttributesRecord } from "../../domain/value-object/variant-attributes.vo";


export const PRODUCT_REPOSITORY = Symbol("PRODUCT_REPOSITORY");

export interface ProductRepository {
  create(prod: Product, tx?: TransactionContext): Promise<Product>;

  findById(id: ProductId, tx?: TransactionContext): Promise<Product | null>;
  findByIdWithUnitInfo(id: ProductId, tx?: TransactionContext): Promise<ProductWithUnitInfo | null>;
  findByName(name: string, tx?: TransactionContext): Promise<Product | null>;
  listRowMaterialProduct(row?: boolean,tx?: TransactionContext): Promise<RowMaterial[]>;
  searchRowMaterialProduct(
    params: { q: string; raw?: boolean; withRecipes?: boolean },
    tx?: TransactionContext,
  ): Promise<RowMaterial[]>;
  listFinishedWithRecipesProduct(tx?: TransactionContext): Promise<RowMaterial[]>;
  listFinishedActive(tx?: TransactionContext): Promise<Product[]>;
  listPrimaActive(tx?: TransactionContext): Promise<Product[]>;

  update(
    params: {
      id: ProductId;
      name?: string;
      description?: string | null;
      baseUnitId?: string;
      sku?: string;
      barcode?: string | null;
      customSku?: string | null;
      price?: Money;
      cost?: Money;
      attributes?: AttributesRecord;
      type?: ProductType;
    },
    tx?: TransactionContext,
  ): Promise<Product | null>;

  setActive(id: ProductId, isActive: boolean, tx?: TransactionContext): Promise<void>;

  setAllVariantsActive(id: ProductId, isActive: boolean, tx?: TransactionContext): Promise<void>;
  findLastCreated(tx?: TransactionContext): Promise<Product | null>;

  getByIdWithVariants(
    id: ProductId,
    tx?: TransactionContext,
  ): Promise<{ product: Product; items: ProductVariant[] } | null>;

  listVariants(id: ProductId, tx?: TransactionContext): Promise<ProductVariant[]>;
  findBySku(sku: string, tx?: TransactionContext): Promise<Product | null>;
  findByBarcode(barcode: string, tx?: TransactionContext): Promise<Product | null>;

  searchPaginated(
    params: {
      isActive?: boolean;
      name?: string;
      description?: string;
      sku?: string;
      barcode?: string;
      type?: ProductType;
      q?: string;
      page: number;
      limit: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: Array<{ product: Product; baseUnitName?: string; baseUnitCode?: string }>; total: number }>;

  countAll(tx?: TransactionContext): Promise<number>;
  countByActive(isActive: boolean, tx?: TransactionContext): Promise<number>;
  countCreatedSince(from: Date, tx?: TransactionContext): Promise<number>;
  countUpdatedSince(from: Date, tx?: TransactionContext): Promise<number>;
  createdByMonthSince(from: Date, tx?: TransactionContext): Promise<Array<{ month: string; count: number }>>;
  latest(limit: number, tx?: TransactionContext): Promise<Array<{ id: string; name: string; isActive: boolean; createdAt: Date }>>;
}
