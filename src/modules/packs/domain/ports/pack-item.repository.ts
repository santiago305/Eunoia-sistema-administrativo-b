import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { PackItem } from "../entities/pack-item";

export const PACK_ITEM_REPOSITORY = Symbol("PACK_ITEM_REPOSITORY");

export interface PackItemRepository {
  createMany(items: PackItem[], tx?: TransactionContext): Promise<void>;
}

