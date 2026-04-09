import { BadRequestException, Inject, Injectable } from "@nestjs/common";

import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";
import { INVENTORY_LOCK, InventoryLock } from "src/modules/product-catalog/compat/ports/inventory-lock.port";
import { INVENTORY_REPOSITORY, InventoryRepository } from "src/modules/product-catalog/compat/ports/inventory.repository.port";

@Injectable()
export class ConsumeReservedMaterialsUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
    @Inject(INVENTORY_LOCK)
    private readonly lock: InventoryLock,
  ) {}

  // reserveMode = true  => suma a reserved
  // reserveMode = false => resta de reserved (consumo)
  async execute(
    params: {
      warehouseId: string;
      consumption: RecipeConsumptionLine[];
      reserveMode?: boolean;
    },
    tx: TransactionContext,
  ): Promise<void> {
    const keys = params.consumption.map((c) => ({
      warehouseId: params.warehouseId,
      stockItemId: c.stockItemId,
      locationId: c.locationId,
    }));

    await this.lock.lockSnapshots(keys, tx);

    for (const c of params.consumption) {
      const requestedLocationId = c.locationId ?? null;
      const forcedLocationId = null;
      console.log('[reserveMaterials] checking snapshot', {
        warehouseId: params.warehouseId,
        stockItemId: c.stockItemId,
        requestedLocationId,
        forcedLocationId,
        qty: c.qty,
      });
      const snapshot = await this.inventoryRepo.getSnapshot(
        {
          warehouseId: params.warehouseId,
          stockItemId: c.stockItemId,
          locationId: forcedLocationId,
        },
        tx,
      );
      console.log('[reserveMaterials] snapshot result', snapshot);

      const available = snapshot?.available ?? 0;
      const reserved = snapshot?.reserved ?? 0;

      if (params.reserveMode) {
        if (!snapshot || available <= 0) {
          const snapshots = await this.inventoryRepo.listSnapshots(
            {
              warehouseId: params.warehouseId,
              stockItemId: c.stockItemId,
            },
            tx,
          );
          console.log('[reserveMaterials] snapshots for stockItem', snapshots);
          throw new BadRequestException("No hay ningún stock del producto");
        }
        if (available < c.qty) {
          const snapshots = await this.inventoryRepo.listSnapshots(
            {
              warehouseId: params.warehouseId,
              stockItemId: c.stockItemId,
            },
            tx,
          );
          console.log('[reserveMaterials] snapshots for stockItem', snapshots);
          throw new BadRequestException("No hay stock suficiente");
        }
      } else {
        if (reserved < c.qty) {
          const snapshots = await this.inventoryRepo.listSnapshots(
            {
              warehouseId: params.warehouseId,
              stockItemId: c.stockItemId,
            },
            tx,
          );
          console.log('[reserveMaterials] snapshots for stockItem', snapshots);
          throw new BadRequestException("Reserva insuficiente");
        }
      }
    }

    for (const c of params.consumption) {
      await this.inventoryRepo.incrementReserved(
        {
          warehouseId: params.warehouseId,
          stockItemId: c.stockItemId,
          locationId: null,
          delta: params.reserveMode ? c.qty : -c.qty,
        },
        tx,
      );
    }
  }
}


