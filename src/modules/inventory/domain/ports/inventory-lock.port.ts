import { TransactionContext } from './unit-of-work.port';

export const INVENTORY_LOCK = Symbol('INVENTORY_LOCK');

export interface InventoryLock {
  lockSnapshots(
    keys: Array<{ warehouseId: string; stockItemId: string; locationId?: string }>,
    tx: TransactionContext,
  ): Promise<void>;
}

