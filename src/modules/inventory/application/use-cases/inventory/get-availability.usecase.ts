import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { INVENTORY_REPOSITORY, InventoryRepository } from '../../../domain/ports/inventory.repository.port';
import { GetAvailabilityInput } from '../../dto/inputs';
import { AvailabilityOutput } from '../../dto/outputs';

@Injectable()
export class GetAvailabilityUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
  ) {}

  async execute(input: GetAvailabilityInput): Promise<AvailabilityOutput> {
    if (!input.warehouseId || !input.variantId) {
      throw new BadRequestException('warehouseId y variantId son obligatorios');
    }

    const snapshot = await this.inventoryRepo.getSnapshot(input);
    if (!snapshot) {
      return {
        warehouseId: input.warehouseId,
        variantId: input.variantId,
        locationId: input.locationId,
        onHand: 0,
        reserved: 0,
        available: 0,
      };
    }

    return {
      warehouseId: snapshot.warehouseId,
      variantId: snapshot.variantId,
      locationId: snapshot.locationId,
      onHand: snapshot.onHand,
      reserved: snapshot.reserved,
      available: snapshot.available,
    };
  }
}
