import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
import { ProductVariant } from "../entity/product-variant";
import { Money } from "../value-object/money.vo";
import { ProductId } from "../value-object/product-id.vo";
import { AttributesRecord } from "../value-object/variant-attributes.vo";
import { ProductVariantWithProductInfo } from "../read-models/product-variant-with-product-info.rm";
import { RowMaterial } from "../read-models/row-materials";

export const PRODUCT_VARIANT_REPOSITORY = Symbol("PRODUCT_VARIANT_REPOSITORY");

export interface ProductVariantRepository {
  create(variant: ProductVariant, tx?: TransactionContext): Promise<ProductVariant>;

  update(
    params: {
      id: string;
      sku?: string;
      barcode?: string | null;
      attributes?: AttributesRecord;
      price?: Money;
      cost?: Money;
    },
    tx?: TransactionContext,
  ): Promise<ProductVariant | null>;

  findLastCreated(tx?: TransactionContext): Promise<ProductVariant | null>;
  findLastSkuByPrefix(prefix: string, tx?: TransactionContext): Promise<string | null>;

  setActive(id: string, isActive: boolean, tx?: TransactionContext): Promise<void>;

  findById(id: string, tx?: TransactionContext): Promise<ProductVariant | null>;
  findBySku(sku: string, tx?: TransactionContext): Promise<ProductVariant | null>;
  findByBarcode(barcode: string, tx?: TransactionContext): Promise<ProductVariant | null>;

  listByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]>;
  listRowMaterial(tx?: TransactionContext): Promise<RowMaterial[]>;
  listActiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]>;
  listInactiveByProductId(productId: ProductId, tx?: TransactionContext): Promise<ProductVariant[]>;

  search(
    params: {
      productId?: ProductId;
      isActive?: boolean;
      sku?: string;
      barcode?: string;
      q?: string;
      productName?: string;
      productDescription?: string;
      type?:string,
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: ProductVariantWithProductInfo[]; total: number }>;

  countAll(tx?: TransactionContext): Promise<number>;
  countByActive(isActive: boolean, tx?: TransactionContext): Promise<number>;
  countCreatedSince(from: Date, tx?: TransactionContext): Promise<number>;
  countUpdatedSince(from: Date, tx?: TransactionContext): Promise<number>;
  createdByMonthSince(from: Date, tx?: TransactionContext): Promise<Array<{ month: string; count: number }>>;
  latest(
    limit: number,
    tx?: TransactionContext,
  ): Promise<Array<{ id: string; sku: string; productId: string; isActive: boolean; createdAt: Date }>>;
}
