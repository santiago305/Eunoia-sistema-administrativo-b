import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ProductCatalogInsufficientReservationError } from "../errors/product-catalog-insufficient-reservation.error";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "../../domain/ports/inventory.repository";

@Injectable()
export class ReserveProductCatalogMaterials {
  constructor(
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
  ) {}

  async execute(params: {
    warehouseId: string;
    consumption: Array<{ stockItemId: string; locationId?: string; qty: number; materialLabel?: string }>;
    reserveMode?: boolean;
  }) {
    for (const line of params.consumption) {
      const snapshot = await this.inventoryRepo.getSnapshot({
        warehouseId: params.warehouseId,
        stockItemId: line.stockItemId,
        locationId: line.locationId ?? null,
      });

      const available = snapshot?.available ?? 0;
      const reserved = snapshot?.reserved ?? 0;

      if (params.reserveMode) {
        if (!snapshot || available < line.qty) {
          const material = line.materialLabel?.trim() || "Materia prima sin identificar";
          const onHand = snapshot?.onHand ?? 0;
          throw new BadRequestException(
            `Stock insuficiente para ${material}. Requerido: ${formatQuantity(line.qty)}. Stock: ${formatQuantity(onHand)}. Reservado: ${formatQuantity(reserved)}. Disponible: ${formatQuantity(available)}.`,
          );
        }
      } else {
        if (reserved < line.qty) {
          throw new BadRequestException(new ProductCatalogInsufficientReservationError().message);
        }
      }
    }

    for (const line of params.consumption) {
      await this.inventoryRepo.incrementReserved({
        warehouseId: params.warehouseId,
        stockItemId: line.stockItemId,
        locationId: line.locationId ?? null,
        delta: params.reserveMode ? line.qty : -line.qty,
      });
    }
  }
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : Number(value.toFixed(6)).toString();
}
