// src/modules/production/application/usecases/production-order/consume-reserved-materials.usecase.ts
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { INVENTORY_REPOSITORY, InventoryRepository } from "src/modules/inventory/domain/ports/inventory.repository.port";
import { INVENTORY_LOCK, InventoryLock } from "src/modules/inventory/domain/ports/inventory-lock.port";
import { TransactionContext } from "src/modules/inventory/domain/ports/unit-of-work.port";
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
      stockItemId: c.variantId,
      locationId: c.locationId,
    }));

    await this.lock.lockSnapshots(keys, tx);

    for (const c of params.consumption) {
      const snapshot = await this.inventoryRepo.getSnapshot(
        {
          warehouseId: params.warehouseId,
         stockItemId: c.variantId,
          locationId: c.locationId,
        },
        tx,
      );

      const available = snapshot?.available ?? 0;
      const reserved = snapshot?.reserved ?? 0;

      if (params.reserveMode) {
        if (available < c.qty) {
          throw new BadRequestException({
            type: "error",
            message: "Materia prima insuficiente",
            item: {
              variantId: c.variantId,
              locationId: c.locationId,
              required: c.qty,
              available,
            },
          });
        }
      } else {
        if (reserved < c.qty) {
          throw new BadRequestException({
            type: "error",
            message: "Reserva insuficiente",
            item: {
              variantId: c.variantId,
              locationId: c.locationId,
              required: c.qty,
              reserved,
            },
          });
        }
      }
    }

    for (const c of params.consumption) {
      await this.inventoryRepo.incrementReserved(
        {
          warehouseId: params.warehouseId,
          stockItemId: c.variantId,
          locationId: c.locationId,
          delta: params.reserveMode ? c.qty : -c.qty,
        },
        tx,
      );
    }
  }
}
