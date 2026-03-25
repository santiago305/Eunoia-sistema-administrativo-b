import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { INVENTORY_REPOSITORY, InventoryRepository } from '../../../domain/ports/inventory.repository.port';
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from '../../../domain/ports/stock-item/stock-item.repository.port';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { GetStockInput } from '../../dto/inventory/input/get-stock';
import { AvailabilityOutput } from '../../dto/inventory/output/availability-out';
import { errorResponse } from 'src/shared/response-standard/response';

@Injectable()
export class GetStockUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: StockItemRepository,
  ) {}

  async execute(input: GetStockInput, tx?: TransactionContext): Promise<AvailabilityOutput> {
    if (!input.warehouseId || !input.itemId) {
      throw new BadRequestException(errorResponse('warehouseId y itemId son obligatorios'));
    }

    const stockItemCache = new Map<string, string>();

    let stockItemId = stockItemCache.get(input.itemId);
    if (!stockItemId) {
      const stockItem =
        (await this.stockItemRepo.findById(input.itemId, tx)) ??
        (await this.stockItemRepo.findByProductIdOrVariantId(input.itemId, tx));
      if (!stockItem?.stockItemId) {
        throw new NotFoundException(errorResponse('Stock item no encontrado'));
      }
      stockItemId = stockItem.stockItemId;
      stockItemCache.set(input.itemId, stockItemId);
    }

    const snapshot = await this.inventoryRepo.getSnapshot(
      {
        warehouseId: input.warehouseId,
        stockItemId,
        locationId: input.locationId,
      },
      tx,
    );

    if (!snapshot) {
      return {
        warehouseId: input.warehouseId,
        stockItemId,
        locationId: input.locationId,
        onHand: 0,
        reserved: 0,
        available: 0,
      };
    }

    return {
      warehouseId: snapshot.warehouseId,
      stockItemId: snapshot.stockItemId,
      locationId: snapshot.locationId,
      onHand: snapshot.onHand,
      reserved: snapshot.reserved,
      available: snapshot.available,
    };
  }
}
