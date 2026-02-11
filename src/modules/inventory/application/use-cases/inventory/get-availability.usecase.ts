import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { INVENTORY_REPOSITORY, InventoryRepository } from '../../../domain/ports/inventory.repository.port';
import { TransactionContext } from '../../../domain/ports/unit-of-work.port';
import { GetAvailabilityInput } from '../../dto/inventory/input/get-availability';
import { AvailabilityOutput } from '../../dto/inventory/output/availability-out';

@Injectable()
export class GetAvailabilityUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
  ) {}

  async execute(input: GetAvailabilityInput, tx?: TransactionContext): Promise<AvailabilityOutput> {
    if (!input.warehouseId || !input.variantId) {
      throw new BadRequestException('warehouseId y variantId son obligatorios');
    }

    const snapshot = await this.inventoryRepo.getSnapshot(input, tx);
    if (!snapshot) {
      return {
        warehouseId: input.warehouseId,
        variantId: input.variantId,
        onHand: 0,
        reserved: 0,
        available: 0,
      };
    }

    return {
      warehouseId: snapshot.warehouseId,
      variantId: snapshot.variantId,
      onHand: snapshot.onHand,
      reserved: snapshot.reserved,
      available: snapshot.available,
    };
  }
}
