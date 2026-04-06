import { Inject, Injectable } from '@nestjs/common';
import { ListInventoryInput } from '../../dto/inventory/input/list-inventory';
import { InventorySnapshotOutput } from '../../dto/inventory/output/inventory-snapshot';
import { INVENTORY_REPOSITORY, InventoryRepository } from '../../ports/inventory.repository.port';
import { InventoryOutputMapper } from '../../mappers/inventory-output.mapper';

@Injectable()
export class ListInventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepo: InventoryRepository,
  ) {}

  async execute(input: ListInventoryInput): Promise<InventorySnapshotOutput[]> {
    const rows = await this.inventoryRepo.listSnapshots(input);
    return rows.map((snapshot) => InventoryOutputMapper.toInventorySnapshotOutput(snapshot));
  }
}

