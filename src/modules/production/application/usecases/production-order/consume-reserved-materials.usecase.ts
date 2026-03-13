// src/modules/production/application/usecases/production-order/consume-reserved-materials.usecase.ts
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { INVENTORY_REPOSITORY, InventoryRepository } from "src/modules/inventory/domain/ports/inventory.repository.port";
import { INVENTORY_LOCK, InventoryLock } from "src/modules/inventory/domain/ports/inventory-lock.port";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";
import { RecipeConsumptionLine } from "./build-consumption-from-recipes.usecase";

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
      console.log('[reserveMaterials] checking snapshot', {
        warehouseId: params.warehouseId,
        stockItemId: c.stockItemId,
        locationId:  null,
        qty: c.qty,
      });
      const snapshot = await this.inventoryRepo.getSnapshot(
        {
          warehouseId: params.warehouseId,
          stockItemId: c.stockItemId,
          locationId: null,
        },
        tx,
      );
      console.log('[reserveMaterials] snapshot result', snapshot);

      const available = snapshot?.available ?? 0;
      const reserved = snapshot?.reserved ?? 0;

      if (params.reserveMode) {
        if (!snapshot || available <= 0) {
          throw new BadRequestException({
            type: "error",
            message: "No hay ningun stock del producto",
          });
        }
        if (available < c.qty) {
          throw new BadRequestException({
            type: "error",
            message: "No hay stock suficiente",
          });
        }
      } else {
        if (reserved < c.qty) {
          throw new BadRequestException({
            type: "error",
            message: "Reserva insuficiente3",
          });
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
