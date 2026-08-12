import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { Pack } from '../entities/pack';
import { PackSearchRule } from 'src/modules/packs/application/dtos/pack-search/pack-search-snapshot';

export const PACK_REPOSITORY = Symbol('PACK_REPOSITORY');

export type PackWithItems = {
  pack: Pack;
  items: Array<{
    id: string;
    skuId: string;
    quantity: number;
    price: number;
    lineTotal: number;
    sku: {
      id: string;
      backendSku: string;
      customSku?: string | null;
      name: string;
      barcode?: string | null;
      price: number;
      image?: string | null;
      isActive: boolean;
      attributes: Array<{ code: string; name: string | null; value: string }>;
    };
  }>;
};

export type PackCompositionItem = {
  skuId: string;
  quantity: number;
};

export interface PackRepository {
  listActiveByProductId(
    productId: string,
    tx?: TransactionContext,
  ): Promise<Array<{ id: string; description: string; affectedItems: number }>>;
  listActiveBySkuId(
    skuId: string,
    tx?: TransactionContext,
  ): Promise<Array<{ id: string; description: string }>>;
  listActiveBySkuId(
    skuId: string,
    tx?: TransactionContext,
  ): Promise<Array<{ id: string; description: string }>>;
  removeProductFromActivePacks(
    productId: string,
    tx?: TransactionContext,
  ): Promise<
    Array<{
      id: string;
      description: string;
      remainingItems: number;
      isActive: boolean;
    }>
  >;
  findById(packId: string, tx?: TransactionContext): Promise<Pack | null>;
  findByIdWithItems(
    packId: string,
    tx?: TransactionContext,
  ): Promise<PackWithItems | null>;
  findActiveByExactComposition(
    composition: PackCompositionItem[],
    tx?: TransactionContext,
  ): Promise<PackWithItems[]>;
  create(pack: Pack, tx?: TransactionContext): Promise<Pack>;
  update(pack: Pack, tx?: TransactionContext): Promise<Pack>;
  setActive(
    packId: string,
    isActive: boolean,
    tx?: TransactionContext,
  ): Promise<void>;
  list(
    params: {
      q?: string;
      isActive?: boolean;
      filters?: PackSearchRule[];
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: PackWithItems[]; total: number }>;
}
