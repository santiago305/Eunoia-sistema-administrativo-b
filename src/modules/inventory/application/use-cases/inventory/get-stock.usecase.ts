import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { GetStockInput } from '../../dto/inventory/input/get-stock';
import { AvailabilityOutput } from '../../dto/inventory/output/availability-out';
import { INVENTORY_REPOSITORY, InventoryRepository } from '../../ports/inventory.repository.port';
import { STOCK_ITEM_REPOSITORY, StockItemRepository } from '../../ports/stock-item.repository.port';
import { StockItemNotFoundApplicationError } from '../../errors/stock-item-not-found.error';
import { InventoryOutputMapper } from '../../mappers/inventory-output.mapper';

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
      throw new BadRequestException('warehouseId y itemId son obligatorios');
    }

    const stockItemCache = new Map<string, string>();

    let stockItemId = stockItemCache.get(input.itemId);
    if (!stockItemId) {
      const stockItem =await this.stockItemRepo.findByProductIdOrVariantId(input.itemId ?? input.stockItemId, tx);
      if (!stockItem?.stockItemId) {
        throw new NotFoundException(new StockItemNotFoundApplicationError().message);
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
      return InventoryOutputMapper.emptyAvailability({
        warehouseId: input.warehouseId,
        stockItemId,
        locationId: input.locationId,
      });
    }

    return InventoryOutputMapper.toAvailabilityOutput(snapshot);
  }
}
