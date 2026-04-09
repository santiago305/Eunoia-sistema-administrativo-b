import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { Inventory } from '../../domain/entities/inventory';

export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY');

export interface InventoryRepository {
  getSnapshot(
    params: {
      warehouseId: string;
      stockItemId: string;
      locationId?: string;
    },
    tx?: TransactionContext,
  ): Promise<Inventory | null>;

  findByKeys(
    keys: Array<{ warehouseId: string; stockItemId: string; locationId?: string }>,
    tx?: TransactionContext,
  ): Promise<Inventory[]>;

  listSnapshots(
    params: {
      warehouseId?: string;
      stockItemId?: string;
      locationId?: string;
      search?: string;
      type?: string;
      page?: number;
      limit?: number;
    },
    tx?: TransactionContext,
  ): Promise<{
    items: Inventory[];
    total: number;
    page: number;
    limit: number;
  }>;

  upsertSnapshot(snapshot: Inventory, tx?: TransactionContext): Promise<void>;

  incrementOnHand(
    params: {
      warehouseId: string;
      stockItemId: string;
      locationId?: string;
      delta: number;
    },
    tx?: TransactionContext,
  ): Promise<Inventory>;

  incrementReserved(
    params: {
      warehouseId: string;
      stockItemId: string;
      locationId?: string;
      delta: number;
    },
    tx?: TransactionContext,
  ): Promise<Inventory>;
}

