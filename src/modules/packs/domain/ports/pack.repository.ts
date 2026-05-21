import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { Pack } from "../entities/pack";

export const PACK_REPOSITORY = Symbol("PACK_REPOSITORY");

export interface PackRepository {
  findById(packId: string, tx?: TransactionContext): Promise<Pack | null>;
  findByIdWithItems?(
    packId: string,
    tx?: TransactionContext,
  ): Promise<{
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
        isActive: boolean;
      };
    }>;
  } | null>;
  create(pack: Pack, tx?: TransactionContext): Promise<Pack>;
  setActive(packId: string, isActive: boolean, tx?: TransactionContext): Promise<void>;
  list(
    params: { q?: string; isActive?: boolean; page?: number; limit?: number },
    tx?: TransactionContext,
  ): Promise<{ items: Pack[]; total: number }>;
}
