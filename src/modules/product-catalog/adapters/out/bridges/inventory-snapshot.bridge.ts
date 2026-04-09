import { Inject, Injectable } from "@nestjs/common";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { InventoryRepository } from "src/modules/product-catalog/compat/ports/inventory.repository.port";
import { Inventory } from "src/modules/product-catalog/compat/entities/inventory";
import { PRODUCT_CATALOG_INVENTORY_REPOSITORY, ProductCatalogInventoryRepository } from "src/modules/product-catalog/domain/ports/inventory.repository";

@Injectable()
export class InventorySnapshotBridge implements InventoryRepository {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly repo: ProductCatalogInventoryRepository,
  ) {}

  private toLegacy(row: any): Inventory {
    return new Inventory(row.warehouseId, row.stockItemId, row.onHand, row.reserved, row.available, row.locationId ?? undefined, row.updatedAt);
  }

  async getSnapshot(params: { warehouseId: string; stockItemId: string; locationId?: string | undefined; }, tx?: TransactionContext): Promise<Inventory | null> {
    const row = await this.repo.getSnapshot({ warehouseId: params.warehouseId, stockItemId: params.stockItemId, locationId: params.locationId ?? null }, tx);
    return row ? this.toLegacy(row) : null;
  }
  async findByKeys(keys: { warehouseId: string; stockItemId: string; locationId?: string | undefined; }[], tx?: TransactionContext): Promise<Inventory[]> {
    const out: Inventory[] = [];
    for (const key of keys) {
      const row = await this.getSnapshot(key, tx);
      if (row) out.push(row);
    }
    return out;
  }
  async listSnapshots(params: { warehouseId?: string | undefined; stockItemId?: string | undefined; locationId?: string | undefined; }, tx?: TransactionContext): Promise<Inventory[]> {
    if (!params.stockItemId) return [];
    return (await this.repo.listByStockItemId(params.stockItemId, tx)).map((row) => this.toLegacy(row));
  }
  async upsertSnapshot(snapshot: Inventory, tx?: TransactionContext): Promise<void> {
    await this.repo.upsert({
      warehouseId: snapshot.warehouseId,
      stockItemId: snapshot.stockItemId,
      locationId: snapshot.locationId ?? null,
      onHand: snapshot.onHand,
      reserved: snapshot.reserved,
      available: snapshot.available ?? snapshot.onHand - snapshot.reserved,
      updatedAt: snapshot.updatedAt,
    } as any, tx);
  }
  async incrementOnHand(params: { warehouseId: string; stockItemId: string; locationId?: string | undefined; delta: number; }, tx?: TransactionContext): Promise<Inventory> {
    const snap = (await this.getSnapshot(params, tx)) ?? new Inventory(params.warehouseId, params.stockItemId, 0, 0, 0, params.locationId);
    snap.onHand += params.delta;
    snap.recalcAvailable();
    await this.upsertSnapshot(snap, tx);
    return snap;
  }
  async incrementReserved(params: { warehouseId: string; stockItemId: string; locationId?: string | undefined; delta: number; }, tx?: TransactionContext): Promise<Inventory> {
    const row = await this.repo.incrementReserved({ warehouseId: params.warehouseId, stockItemId: params.stockItemId, locationId: params.locationId ?? null, delta: params.delta }, tx);
    return this.toLegacy(row);
  }
}


