import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { InventoryLock } from "src/modules/product-catalog/integration/inventory/ports/inventory-lock.port";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/infrastructure/typeorm/typeorm.transaction-context";

@Injectable()
export class InventoryLockBridge implements InventoryLock {
  private getManager(tx: TransactionContext): EntityManager {
    const ctx = tx as TypeormTransactionContext;
    if (!ctx?.manager) throw new Error("TransactionContext invalido");
    return ctx.manager;
  }
  async lockSnapshots(keys: Array<{ warehouseId: string; stockItemId: string; locationId?: string; }>, tx: TransactionContext): Promise<void> {
    const manager = this.getManager(tx);
    for (const key of keys) {
      const lockKey = `pcinv:${key.warehouseId}:${key.stockItemId}:${key.locationId ?? "null"}`;
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [lockKey]);
    }
  }
}


