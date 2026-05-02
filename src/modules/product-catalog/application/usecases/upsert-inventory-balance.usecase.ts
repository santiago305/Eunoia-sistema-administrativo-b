import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCatalogStockItemNotFoundError } from "../errors/product-catalog-stock-item-not-found.error";
import { ProductCatalogInventoryBalance } from "../../domain/entities/inventory-balance";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "../../domain/ports/inventory.repository";
import {
  PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
  ProductCatalogStockItemRepository,
} from "../../domain/ports/stock-item.repository";

@Injectable()
export class UpsertProductCatalogInventoryBalance {
  constructor(
    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,
    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,
  ) {}

  async execute(input: {
    stockItemId: string;
    warehouseId: string;
    locationId?: string | null;
    onHand: number;
    reserved?: number;
  }) {
    const stockItem = await this.stockItemRepo.findById(input.stockItemId);
    if (!stockItem) throw new NotFoundException(new ProductCatalogStockItemNotFoundError().message);
    const reserved = input.reserved ?? 0;
    if (!Number.isFinite(input.onHand) || input.onHand < 0) {
      throw new BadRequestException("El inventario no puede ser negativo");
    }
    if (!Number.isFinite(reserved) || reserved < 0) {
      throw new BadRequestException("La reserva no puede ser negativa");
    }
    if (reserved > input.onHand) {
      throw new BadRequestException("La reserva no puede ser mayor al inventario");
    }
    return this.inventoryRepo.upsert(
      new ProductCatalogInventoryBalance(
        input.warehouseId,
        input.stockItemId,
        input.locationId ?? null,
        input.onHand,
        reserved,
        input.onHand - reserved,
      ),
    );
  }
}
