import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PackItem } from "../entities/pack-item";

export const PACK_ITEM_REPOSITORY = Symbol("PACK_ITEM_REPOSITORY");

export interface PackItemRepository {
  createMany(items: PackItem[], tx?: TransactionContext): Promise<void>;
  listByPackId(
    packId: string,
    tx?: TransactionContext,
  ): Promise<Array<{ id: string; skuId: string; quantity: number; price: number }>>;
  deleteByIds(ids: string[], tx?: TransactionContext): Promise<void>;
  updateMany(
    patch: Array<{ id: string; quantity: number; price: number }>,
    tx?: TransactionContext,
  ): Promise<void>;
}
