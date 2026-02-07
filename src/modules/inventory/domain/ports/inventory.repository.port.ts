import { Inventory } from '../entities/inventory';
import { TransactionContext } from './unit-of-work.port';

export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY');

export interface InventoryRepository {
  getSnapshot(
    params: {
      warehouseId: string;
      variantId: string;
      locationId?: string;
    },
    tx?: TransactionContext,
  ): Promise<Inventory | null>;

  findByKeys(
    keys: Array<{ warehouseId: string; variantId: string; locationId?: string }>,
    tx?: TransactionContext,
  ): Promise<Inventory[]>;

  listSnapshots(
    params: {
      warehouseId?: string;
      variantId?: string;
      locationId?: string;
    },
    tx?: TransactionContext,
  ): Promise<Inventory[]>;

  upsertSnapshot(snapshot: Inventory, tx?: TransactionContext): Promise<void>;

  incrementOnHand(
    params: {
      warehouseId: string;
      variantId: string;
      locationId?: string;
      delta: number;
    },
    tx?: TransactionContext,
  ): Promise<Inventory>;

  incrementReserved(
    params: {
      warehouseId: string;
      variantId: string;
      locationId?: string;
      delta: number;
    },
    tx?: TransactionContext,
  ): Promise<Inventory>;
}
