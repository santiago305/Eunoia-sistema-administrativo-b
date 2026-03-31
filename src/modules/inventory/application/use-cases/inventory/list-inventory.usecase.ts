import { Inject, Injectable } from '@nestjs/common';
import { ListInventoryInput } from '../../dto/inventory/input/list-inventory';
import { InventorySnapshotOutput } from '../../dto/inventory/output/inventory-snapshot';
import { INVENTORY_REPOSITORY, InventoryRepository } from '../../ports/inventory.repository.port';

@Injectable()
export class ListInventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
  ) {}

  async execute(input: ListInventoryInput): Promise<InventorySnapshotOutput[]> {
    const rows = await this.inventoryRepo.listSnapshots(input);
    return rows.map((s) => ({
      warehouseId: s.warehouseId,
      stockItemId: s.stockItemId,
      locationId: s.locationId,
      onHand: s.onHand,
      reserved: s.reserved,
      available: s.available,
    }));
  }
}

