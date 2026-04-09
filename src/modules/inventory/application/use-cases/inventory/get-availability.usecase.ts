import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { GetAvailabilityInput } from '../../dto/inventory/input/get-availability';
import { AvailabilityOutput } from '../../dto/inventory/output/availability-out';
import { INVENTORY_REPOSITORY, InventoryRepository } from '../../ports/inventory.repository.port';
import { InventoryOutputMapper } from '../../mappers/inventory-output.mapper';

@Injectable()
export class GetAvailabilityUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
  ) {}

  async execute(input: GetAvailabilityInput, tx?: TransactionContext): Promise<AvailabilityOutput> {
    if (!input.warehouseId || !input.stockItemId) {
      throw new BadRequestException('warehouseId y stockItemId son obligatorios');
    }

    const snapshot = await this.inventoryRepo.getSnapshot({
      warehouseId: input.warehouseId,
      stockItemId: input.stockItemId ?? input.itemId,
      locationId: input.locationId,
    }, tx);
    if (!snapshot) {
      return InventoryOutputMapper.emptyAvailability({
        warehouseId: input.warehouseId,
        stockItemId: input.stockItemId ?? input.itemId,
        locationId: input.locationId,
      });
    }

    return InventoryOutputMapper.toAvailabilityOutput(snapshot);
  }
}

